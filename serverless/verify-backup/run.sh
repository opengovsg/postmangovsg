#!/bin/bash

# This helper script does the following:
# 1. Generate temporary AWS session credentials with MFA
# 2. Send local SSH key to jumphost in order to create an SSH tunnel with EC2 instance connect
# 3. Generate RDS auth token
# 4. Create SSH tunnel to RDS instance through jumphost using SSH keys sent in step 2

echo $GOOGLE_APPLICATION_CREDENTIALS
ls
mkdir -p /run/postgresql/
chown -R postgres:postgres /run/postgresql/
su - postgres -c "initdb /var/lib/postgresql/data"
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/log.log && createdb postmangovsg_dev"
npm start || echo 'Data dump restoration failed!' && exit 1
su - postgres -c "psql -d postmangovsg_dev -c 'SELECT 1+1'"
echo "Successfully restored data dump"

npm run start-server
