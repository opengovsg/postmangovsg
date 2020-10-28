#!/bin/bash

# Downloads latest backup dump and decrypts it
npm run decrypt-dump

# Find for existing db; If exists, drop previously created db
echo 'Preparing db'
su - postgres -c "psql -lqt | cut -d \| -f 1 | grep -qw postmangovsg_dev && dropdb postmangovsg_dev"
su - postgres -c "createdb postmangovsg_dev"

# Restore dump; On error, print error message and exit script
echo 'Restoring data dump'
pg_restore --no-owner -h localhost -p 5432 -U postgres -d postmangovsg_dev postman.decrypted.dump || \
{ echo 'Data dump restoration failed!' && exit 1; }

echo 'Making simple query on db'
su - postgres -c "psql -d postmangovsg_dev -c 'SELECT 1+1'" || \
{ echo 'Data dump restoration failed!' && exit 1; }
echo "Successfully restored data dump"