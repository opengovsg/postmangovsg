# Serverless

 - [Email status update from SES](#email-status-update-from-ses)
 - [Postman API Gateway Authorizer](postman-api-gateway-authorizer)
 - [SMS status update from Twilio](#sms-status-update-from-twilio)

## Email status update from SES
`log-email-sns`: Meant for SNS to call when SES updates the status of email delivery, essentially acting as the bounce/complaint processor.

![Flow for email status](https://user-images.githubusercontent.com/33112945/83092446-e3475a00-a0cf-11ea-8626-dcdb7c4d5dfe.png)


### Creating Topics
Create SNS topics for the SES delivery status update. Read [here](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/configure-sns-notifications.html).

### Include original headers
In the lambda, we make use of the message id in the original headers to find out which message the notification is for. Please enable it.

### Connecting to DB
Once the lambda is deployed, ensure that the lambda is in the same VPC with the database and the right security group configurations.

### Topics supported
Currently, the lambda handles:
- Successful deliveries
- Bounces

### Environment variables
| Name                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `DB_URI`              | URI to the postgres database                                                      |
| `CALLBACK_SECRET`     | Secret for basic auth                                                             |
| `MIN_HALT_NUMBER`     | Halt if there is this minimum number of invalid recipients, and it exceeds the percentage threshold |
| `MIN_HALT_PERCENTAGE` | Halt if the percentage of invalid recipients exceeds this threshold. Supply a float from 0 to 1  |
| `SENDGRID_PUBLIC_KEY` | Public key used to verify webhook events from sendgrid  |

## Postman API Gateway Authorizer
`postman-api-gateway-authorizer` controls access to the twilio callback endpoint in API Gateway. 

Only requests which have an Authorization header present are allowed access. Else, this authorizer responds with `401 Unauthorized`. Twilio first makes a request, and then expects a `WWW-Authenticate` header and a `realm` in the response, in order to make the same request with an `Authorization` header. This authorizer is needed to send the `WWW-Authenticate` header without being remapped by API Gateway. Learn more [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html#api-gateway-known-issues-rest-apis).

The following setup guides explain how to setup the authorizer and gateway response in API Gateway in conjunction with the `log-twilio-callback` to implement [Twilio Basic Authentication](https://www.twilio.com/docs/usage/security#http-authentication) for incoming requests.

### Setup API Gateway Authorizer
1. Create a new lambda authorizer in API Gateway and assign it to authorizer lambda function
2. Choose lambda event payload to be Request and Authorization header as an identitiy source
Refer to [guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html#api-gateway-lambda-authorizer-request-lambda-function-create)

### Setup Gateway Response
Configure the Unauthorized response type with `WWW-Authenticate: Basic realm=TwilioCallback`

## SMS status update from Twilio

`log-twilio-callback`handles SMS delivery callbacks from Twilio. 

### Configuring callback url 
Set the sms callback url when sending a message via the Twilio sdk or in the Twilio settings. Read [https://www.twilio.com/docs/sms/outbound-message-logging#receive-a-status-callback](https://www.twilio.com/docs/sms/outbound-message-logging#receive-a-status-callback)

### Authorizing incoming Twilio requests
The callback url provided includes username and password, where `username` is a random string and `password` is a hash of `username, messageId, campaignId and a secret token`. 

[Postman API Gateway Authorizer](postman-api-gateway-authorizer) ensures that incoming Twilio requests have an Authorization header present. `log-twilio-callback` generates a password from the attributes as mentioned above, and compares it with the password in the Twilio Authorization header to authenticate the request.

### Finalised delivery statuses
`log-twilio-callback`is invoked for every change in status of a message. Only finalized statuses are processed and the rest are ignored. Read more about [Twilio Message Statuses](https://support.twilio.com/hc/en-us/articles/223134347-What-are-the-Possible-SMS-and-MMS-Message-Statuses-and-What-do-They-Mean-).

### Environment variables

| Name                     | Description                                                                 |
| ------------------------ | ----------------------------------------------------------------------------|
| `DB_URI`                 | URI to the postgres database                                                |
| `TWILIO_CALLBACK_SECRET` | Secret used to generate the basic auth credentials for twilio callback      |
