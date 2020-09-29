#!/bin/bash
# Ensure that gcloud is in PATH, or use path-to-google-cloud-sdk/bin/gcloud
# https://cloud.google.com/sdk/docs/install#mac

echo 'Submitting build to Cloud Build...'
gcloud builds submit --tag gcr.io/postmangovsg/verify-backup

echo 'Deploying build to Cloud Run...'
gcloud run deploy verify-backup \
  --region asia-southeast1 \
  --no-allow-unauthenticated  \
  --image gcr.io/postmangovsg/verify-backup \
  --platform managed \
  --set-env-vars `cat .env | awk -v ORS=, '{ print $1 }'` \ # pulls env vars from .env file and formats as args
  --memory 512Mi
