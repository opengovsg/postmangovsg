#!/bin/bash

# Before running script:
# 1. Ensure that gcloud is in PATH, or use path-to-google-cloud-sdk/bin/gcloud
# https://cloud.google.com/sdk/docs/install#mac
# 2. Ensure instructions in Pre-requisites to run scripts section in readme are fulfilled

# Creates a new cloud scheduler job
# This cannot be used to update exisitng job, instead refer https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http
echo 'Creating Cloud Scheduler job...'
gcloud scheduler jobs create http $GCLOUD_RUN_SERVICE_NAME \
  --schedule "0 4 * * *" \
  --time-zone 'Asia/Singapore' \
  --uri $GCLOUD_RUN_SERVICE_URL \
  --oidc-service-account-email $GCLOUD_SERVICE_ACCOUNT