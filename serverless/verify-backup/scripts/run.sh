#!/bin/bash

# Initialise postgres
mkdir -p /run/postgresql/
chown -R postgres:postgres /run/postgresql/
su - postgres -c "initdb /var/lib/postgresql/data"

# Start server to listen for pubsub messages
npm run start
