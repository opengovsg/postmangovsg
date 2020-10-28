#!/bin/bash

# Copy local module
cp -R ../modules ./
# Replace the secret id according to the right branch
# Using '#' as a delimiter for SED instead of '/'
# '/' will clash with secret id names, eg: 'staging/eb/postmangovsg-staging-40ffadb'
if [ "$TRAVIS_BRANCH" == "$STAGING_BRANCH" ]; then
  sed -i -e "s#@SECRET_ID#$STAGING_SECRET_ID#g" docker-entrypoint.sh
elif [ "$TRAVIS_BRANCH" == "$PRODUCTION_BRANCH" ]; then
  sed -i -e "s#@SECRET_ID#$PRODUCTION_SECRET_ID#g" docker-entrypoint.sh
fi