### Update elastic beanstalk environment when secret in secrets manager is changed

As we set our environment variables in secrets manager to be shared by the ecs tasks and elastic beanstalk, we need to be able to restart app servers when the secret is changed.

To do so, we set a rule on event bridge to trigger this lambda when a cloudtrail event indicating that a particular secret has been updated. 

* Replace `<REGION>`, `<ACCOUNT_ID>` and `<SECRET_NAME>` in the following

Rule on event bridge:


```json
{
  "source": ["aws.secretsmanager"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["secretsmanager.amazonaws.com"],
    "eventName": ["PutSecretValue"],
    "requestParameters": {
      "secretId": [{
          "prefix": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:<SECRET_NAME>"
        }
      ]
    }
  }
}
```

Sample cloudtrail event for testing event pattern on Event bridge
```json
{
   "version":"0",
   "id":"abc",
   "detail-type":"AWS API Call via CloudTrail",
   "source":"aws.secretsmanager",
   "account":"<ACCOUNT_ID>",
   "time":"2022-01-04T09:12:39Z",
   "region":"<REGION>",
   "resources":[
   ],
   "detail":{
      "eventVersion":"1.08",
      "userIdentity":{
         "type":"IAMUser",
         "principalId":"principalId",
         "arn":"arn:aws:iam::<ACCOUNT_ID>:user/username",
         "accountId":"<ACCOUNT_ID>",
         "accessKeyId":"ABC",
         "userName":"username",
         "sessionContext":{
            "sessionIssuer":{
               
            },
            "webIdFederationData":{
               
            },
            "attributes":{
               "creationDate":"2022-01-04T05:31:41Z",
               "mfaAuthenticated":"true"
            }
         }
      },
      "eventTime":"2022-01-04T09:12:39Z",
      "eventSource":"secretsmanager.amazonaws.com",
      "eventName":"PutSecretValue",
      "awsRegion":"<REGION>",
      "sourceIPAddress":"111.111.111.111",
      "userAgent":"abc",
      "requestParameters":{
         "secretId":"arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:<SECRET_NAME>-<RANDOM_CHARACTERS>",
         "clientRequestToken":"abc"
      },
      "responseElements":null,
      "requestID":"abc",
      "eventID":"abc",
      "readOnly":false,
      "eventType":"AwsApiCall",
      "managementEvent":true,
      "recipientAccountId":"<ACCOUNT_ID>",
      "eventCategory":"Management",
      "sessionCredentialFromConsole":"true"
   }
}
```

Where to set event trigger?
<img width="1224" alt="Screenshot 2022-01-04 at 5 37 03 PM" src="https://user-images.githubusercontent.com/33819199/148039828-09390583-0666-4f24-bd41-308019d2b91a.png">
