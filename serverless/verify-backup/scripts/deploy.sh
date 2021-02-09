#!/bin/bash

# Before running script:
# 1. Ensure that gcloud is in PATH, or use path-to-google-cloud-sdk/bin/gcloud
# https://cloud.google.com/sdk/docs/install#mac
# 2. Ensure instructions in Pre-requisites to run scripts section in readme are fulfilled

echo 'Setting up service account...'
./google-cloud-sdk/bin/gcloud auth activate-service-account $GCLOUD_SERVICE_ACCOUNT --key-file=$GOOGLE_APPLICATION_CREDENTIALS

echo 'Submitting build to Cloud Build...'
./google-cloud-sdk/bin/gcloud builds submit --tag gcr.io/postmangovsg/verify-backup --gcs-log-dir gs://postmangovsg-cloudbuild-logs/logs

echo 'Deploying build to Cloud Run...'
# --set-env-vars `grep -v '^#' .env | awk -v ORS=, 'NF { print $1 }'`pulls env vars from .env file and formats as args
./google-cloud-sdk/bin/gcloud run deploy $GCLOUD_RUN_SERVICE_NAME \
  --region asia-southeast1 \
  --no-allow-unauthenticated \
  --image gcr.io/postmangovsg/verify-backup \
  --service-account $GCLOUD_SERVICE_ACCOUNT \
  --platform managed \
  --set-env-vars `grep -v '^#' .env | awk -v ORS=, 'NF { print $1 }'` \
  --timeout 15m \
  --cpu 1 \
  --memory 4Gi
