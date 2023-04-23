#!/bin/sh
# Get the secrets from aws secrets manager
# transform them into KEY=value pairing, and store in temp file
# transform them into KEY=value pairing, and store in temp file
eval "export $(echo "$(aws secretsmanager get-secret-value --secret-id '@SECRET_ID' --query SecretString --output text)" | jq -r 'to_entries | map("\(.key)=\(.value)") | @sh')"
# rely on dotenv to add the environment variables to the node process

# export DD_SERVICE here as the backend and worker share the same secret from secrets manager for env
export DD_SERVICE=postman
# specific config for dd-agent on EB
export DD_AGENT_HOST=172.17.0.1

npm start
