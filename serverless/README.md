

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