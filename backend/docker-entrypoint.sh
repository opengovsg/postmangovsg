#!/bin/sh
# Get the secrets from aws secrets manager
# transform them into KEY=value pairing, and store in temp file
aws secretsmanager get-secret-value --secret-id '@SECRET_ID' --query SecretString --output text | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' > /tmp/secrets.env
# Export all the key value pairings in the temp file
export "$(cat /tmp/secrets.env)"
rm -f /tmp/secrets.env
npm start
