#!/bin/bash
set -x
pip install awscli-local

awslocal s3 mb s3://$FILE_STORAGE_BUCKET_NAME
awslocal logs create-log-group --log-group-name $AWS_LOG_GROUP_NAME
awslocal logs create-log-stream --log-group-name $AWS_LOG_GROUP_NAME --log-stream-name `node --eval='console.log(require("os").hostname())'`

awslocal s3api put-bucket-cors \
  --bucket $FILE_STORAGE_BUCKET_NAME \
  --cors-configuration file:///docker-entrypoint-initaws.d/bucket-cors.json
