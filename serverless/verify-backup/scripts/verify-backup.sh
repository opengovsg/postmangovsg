#!/bin/bash

# Whether to send notification to Sentry
export SEND_NOTIFICATION=${SEND_NOTIFICATION:-true}

# Set Postgres environment variables to define connection parameters.
# See https://www.postgresql.org/docs/11/libpq-envars.html
export PGHOST=${PGHOST:-localhost}
export PGPORT=${PGPORT:-5432}
export PGUSER=${PGUSER:-postgres}
export PGDATABASE=${PGDATABASE:-postmangovsg_dev}

notify() {
  echo $1
  if [ "$SEND_NOTIFICATION" = true ]; then
    npm run send-sentry-event -- --message "$1"
  fi
}

notifyAndExit() {
  notify "$RESTORE_LOG"
  # Cronitor job failed
  curl "https://cronitor.link/$CRONITOR_CODE/fail" -m 10 || true
  exit 1
}

# Started Cronitor job
curl "https://cronitor.link/$CRONITOR_CODE/run"  -m 10 || true

# Downloads latest backup dump and decrypts it
npm run decrypt-dump

# Start postgres
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/log.log"

# Find for existing db; If exists, drop previously created db
echo 'Preparing db'
dropdb --if-exists $PGDATABASE && createdb $PGDATABASE

# Set env var with the dump version to be restored
DUMP_VERSION=$(cat dump-version.txt)

# Restore dump; On error, print error message and exit script
echo 'Restoring data dump'
RESTORE_LOG="$DUMP_VERSION Data dump restoration failed!"
pg_restore -v --no-owner --dbname $PGDATABASE postman.decrypted.dump || notifyAndExit

echo 'Making simple query on db'
RESTORE_LOG="$DUMP_VERSION Verification query on restored db failed!"
psql -c 'SELECT 1+1' || notifyAndExit

# Get key metrics from restored db and set to env var
DUMP_USERS=$(psql -qAt -c 'select count(*) from users;')
DUMP_CAMPAIGNS=$(psql -qAt -c 'select count(*) from campaigns;')
DUMP_MESSAGES=$(psql -qAt -c 'select sum(sent) from statistics;')
RESTORE_LOG="Successfully restored $DUMP_VERSION db dump! \
  The restored db has $DUMP_USERS users, $DUMP_CAMPAIGNS campaigns and $DUMP_MESSAGES sent messages."

notify "$RESTORE_LOG"

# Completed Cronitor job
curl "https://cronitor.link/$CRONITOR_CODE/complete" -m 10 || true

# Stop postgres
su - postgres -c "pg_ctl stop -D /var/lib/postgresql/data"

rm postman.decrypted.dump
rm postman.dump
rm postman.json
rm secrets.dump
