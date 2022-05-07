# Serverless
See [verify-backup-docs](verify-backup/README.md) for details on `verify-backup`

The serverless functions are deployed onto Lambda, and called via API Gateway. 

* [Postman API Gateway Authorizer](#postman-api-gateway-authorizer)
    + [Setup API Gateway Authorizer](#setup-api-gateway-authorizer)
    + [Setup Gateway Response](#setup-gateway-response)
* [Email status update](#email-status-update)
    + [Handling updates from SES](#handling-updates-from-ses)
        - [Create topics](#create-topics)
        - [Include original headers](#include-original-headers)
    + [Handling updates from Sendgrid](#handling-updates-from-sendgrid)
    + [Environment variables](#environment-variables)
* [SMS status update from Twilio](#sms-status-update-from-twilio)
    + [Configuring callback url](#configuring-callback-url)
    + [Authorizing incoming Twilio requests](#authorizing-incoming-twilio-requests)
    + [Finalised delivery statuses](#finalised-delivery-statuses)
    + [Environment variables](#environment-variables-1)
* [Unsubscribe Email Digest](#unsubscribe-email-digest)
    + [Overview](#overview)
    + [Environment variables](#environment-variables-2)
* [Telegram handler](#telegram-handler)

## Postman API Gateway Authorizer
`postman-api-gateway-authorizer` controls access to the twilio callback endpoint in API Gateway. 

Only requests which have an Authorization header present are allowed access. Else, this authorizer responds with `401 Unauthorized`. Twilio first makes a request, and then expects a `WWW-Authenticate` header and a `realm` in the response, in order to make the same request with an `Authorization` header. This authorizer is needed to send the `WWW-Authenticate` header without being remapped by API Gateway. Learn more [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html#api-gateway-known-issues-rest-apis).

The following setup guides explain how to setup the authorizer and gateway response in API Gateway in conjunction with the `log-twilio-callback` to implement [Twilio Basic Authentication](https://www.twilio.com/docs/usage/security#http-authentication) for incoming requests.

### Setup API Gateway Authorizer
1. Create a new lambda authorizer in API Gateway and assign it to authorizer lambda function
2. Choose lambda event payload to be Request and Authorization header as an identity source
Refer to [guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html#api-gateway-lambda-authorizer-request-lambda-function-create)

### Setup Gateway Response
Configure the Unauthorized response type with `WWW-Authenticate: Basic realm=TwilioCallback`


## Email status update
`log-email-sns`: When the status of an email is updated, this function is called to process the delivered/bounce/complaint status. 

### Handling updates from SES 

#### Create topics 
Create SNS topics for the SES delivery status update. Read [here](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/configure-sns-notifications.html).
The SNS topic can either call the lambda directly, or call the api gateway endpoint which points to the lambda. 

#### Include original headers
Enable `Include original headers` when subscribing to the SNS topics from SES. To pass the message id to the lambda, we include the message id in the sent message, using the header `X-SMTPAPI`. 

### Handling updates from Sendgrid
We use Sendgrid as a backup email provider. Set the [Sendgrid webhook url](https://sendgrid.com/docs/for-developers/tracking-events/getting-started-event-webhook-security-features) to the api gateway endpoint that points to this lambda.


### Environment variables
| Name                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `DB_URI`              | URI to the postgres database                                                      |
| `CALLBACK_SECRET`     | Secret for basic auth                                                             |
| `MIN_HALT_NUMBER`     | Halt if there is this minimum number of invalid recipients, and it exceeds the percentage threshold |
| `MIN_HALT_PERCENTAGE` | Halt if the percentage of invalid recipients exceeds this threshold. Supply a float from 0 to 1  |
| `SENDGRID_PUBLIC_KEY` | Public key used to verify webhook events from sendgrid  |


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

## Unsubscribe Email Digest
`unsubscribe-email-digest` consolidates unsubscribed recipients for campaigns for each user. This lambda can be scheduled to run at weekly schedule in Cloudwatch Events.

### Overview
The `unsubscribers` table stores unsubscribed recipients by `campaign_id` and `sent_at` time which indicates if the recipient has already been included in an unsubscribe digest. 

`unsubscribe-email-digest` retrieves all unsubscribed recipients and consolidated them by campaign for each user. Every user with unsubscribed recipients are sent an email with this digest. The `unsubscribers` table is updated to reflect the email digest `sent_at` time.

### Environment variables
| Name | Description |
| ------------------------ | ---------------------------------------------- |
| `DB_URI` | URI to the postgres database |
| `DB_URI` | URI to the postgres read replica database |
| `SES_HOST` | Amazon SES SMTP endpoint. |
| `SES_PORT` | Amazon SES SMTP port, defaults to 465 |
| `SES_USER` | SMTP username |
| `SES_PASS` | SMTP password |
| `SES_FROM` | The email address that appears in the From field of an email |
| `UNSUBSCRIBE_GUIDE_URL` | URL to unsubscribe guide |
| `SENTRY_DSN` | Sentry DSN for serverless |


## Telegram handler
To be updated
