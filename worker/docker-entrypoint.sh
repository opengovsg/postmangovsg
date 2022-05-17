#!/bin/sh
# Get the secrets from aws secrets manager
# transform them into KEY=value pairing, and store in temp file
aws secretsmanager get-secret-value --secret-id '@SECRET_ID' --query SecretString --output text | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' > .env
# Rely on dotenv to add the environment variables to the node process
# Use exec to replace shell process with npm start so that it can properly handle SIGTERM

# export DD_SERVICE here as the backend and worker share the same secret from secrets manager for env
export DD_SERVICE=postman-worker

exec npm start
