#!/bin/bash

# Downloads latest backup dump and decrypts it
npm run decrypt-dump

# Find for existing db; If exists, drop previously created db
echo 'Preparing db'
su - postgres -c "psql -lqt | cut -d \| -f 1 | grep -qw postmangovsg_dev && dropdb postmangovsg_dev"
su - postgres -c "createdb postmangovsg_dev"

# Set env var with the dump version to be restored
DUMP_VERSION=$(cat dump-version.txt)

# Restore dump; On error, print error message and exit script
echo 'Restoring data dump'
RESTORE_LOG="$DUMP_VERSION Data dump restoration failed!"
pg_restore --no-owner -h localhost -p 5432 -U postgres -d postmangovsg_dev postman.decrypted.dump || \
{ 
  echo $RESTORE_LOG && \
  npm run send-sentry-event -- --message "$RESTORE_LOG" && \
  exit 1;
}

echo 'Making simple query on db'
RESTORE_LOG="$DUMP_VERSION Verification query on restored db failed!"
su - postgres -c "psql -d postmangovsg_dev -c 'SELECT 1+1'" || \
{ 
  echo $RESTORE_LOG && \
  npm run send-sentry-event -- --message "$RESTORE_LOG" && \
  exit 1;
}

# Get key metrics from restored db and set to env var
DUMP_USERS=$(su - postgres -c "psql -qAt -d postmangovsg_dev -c 'select count(*) from users;'")
DUMP_CAMPAIGNS=$(su - postgres -c "psql -qAt -d postmangovsg_dev -c 'select count(*) from campaigns;'")
DUMP_MESSAGES=$(su - postgres -c "psql -qAt -d postmangovsg_dev -c 'select sum(sent) from statistics;'")
RESTORE_LOG="Successfully restored $DUMP_VERSION db dump! \
The restored db has $DUMP_USERS users, $DUMP_CAMPAIGNS campaigns and $DUMP_MESSAGES sent messages."

echo $RESTORE_LOG && \
npm run send-sentry-event -- --message "$RESTORE_LOG"