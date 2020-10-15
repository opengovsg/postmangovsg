#!/bin/sh
# Get the secrets from aws secrets manager
# transform them into KEY=value pairing, and store in temp file
aws secretsmanager get-secret-value --secret-id '@SECRET_ID' --query SecretString --output text | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' > .env
# rely on dotenv to add the environment variables to the node process
npm start
