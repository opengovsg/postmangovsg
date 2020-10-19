#!/bin/bash

# 1. Ensure that gcloud is in PATH, or use path-to-google-cloud-sdk/bin/gcloud
# https://cloud.google.com/sdk/docs/install#mac
# 2. Use a service account key to authenticate to gcloud
# set $GOOGLE_APPLICATION_CREDENTIALS='path-to-key-file'
# https://cloud.google.com/docs/authentication/production
# 3. Set GCLOUD_RUN_SERVICE_ACCOUNT env var to service account


echo 'Submitting build to Cloud Build...'
gcloud builds submit --tag gcr.io/postmangovsg/verify-backup --gcs-log-dir gs://postmangovsg-cloudbuild-logs/logs

echo 'Deploying build to Cloud Run...'
# --set-env-vars `cat .env | awk -v ORS=, '{ print $1 }'`pulls env vars from .env file and formats as args
gcloud run deploy verify-backup \
  --region asia-southeast1 \
  --no-allow-unauthenticated  \
  --image gcr.io/postmangovsg/verify-backup \
  --service-account $GCLOUD_RUN_SERVICE_ACCOUNT \
  --platform managed \
  --set-env-vars `cat .env | awk -v ORS=, '{ print $1 }'` \
  --memory 4G
