#!/bin/bash

# Initialise and start postgres
mkdir -p /run/postgresql/
chown -R postgres:postgres /run/postgresql/
su - postgres -c "initdb /var/lib/postgresql/data"
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/log.log"

# Run script to decrypt and verify backup
sh scripts/verify-backup.sh

# Start server to listen for pubsub messages
npm run start