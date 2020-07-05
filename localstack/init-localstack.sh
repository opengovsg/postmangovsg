#!/bin/bash
set -x
# pip install awscli-local
aws --endpoint-url $AWS_ENDPOINT s3 mb s3://$FILE_STORAGE_BUCKET_NAME
aws --endpoint-url $AWS_ENDPOINT logs create-log-group --log-group-name $AWS_LOG_GROUP_NAME
aws --endpoint-url $AWS_ENDPOINT s3api put-bucket-cors --bucket $FILE_STORAGE_BUCKET_NAME --cors-configuration file://./bucket-cors.json
