# Forking and configuring this product

- [Worker](#worker)
  - [Minimal set of environment variables](#minimal-set-of-environment-variables)
  - [Number of senders and loggers](#number-of-senders-and-loggers)
  - [Full set of environment variables that can be set](#full-set-of-environment-variables-that-can-be-set)
    - [Database](#database)
    - [AWS Settings](#aws-settings)
    - [Sending emails](#sending-emails)
    - [Sending smses](#sending-smses)
    - [Message workers](#message-workers)

## Worker

Worker configuration is a subset of [backend configuration](./backend.md), with a few worker-specific variables.

Setting `NODE_ENV=development` or `NODE_ENV=staging` will override some defaults. If `NODE_ENV` is unset,
default `production` configuration is used.

These defaults can be modified as you wish or overridden with environment variables.

Sensitive configuration has to be set with environment variables.

### Minimal set of environment variables

| Name                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `DB_URI`              | URI to the postgres database                                                      |
| `SECRET_MANAGER_SALT` | Secret used to generate names of credentials to be stored in AWS Secrets Manager  |
| `ECS_SERVICE_NAME`    | **Worker-specific**: ECS service name used for finding the existing running tasks |

### Number of senders and loggers

In a production environment, only 1 worker of 1 variant can be set, that is, the ECS task can have **either** `MESSAGE_WORKER_SENDER=1` or `MESSAGE_WORKER_LOGGER=1` set. This is not enforced in development.

| Name                    | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `MESSAGE_WORKER_SENDER` | **Worker-specific**: Number of sender workers. Defaults to 0 |
| `MESSAGE_WORKER_LOGGER` | **Worker-specific**: Number of logger workers. Defaults to 0 |

### Full set of environment variables that can be set

#### Database

| Name                                     | Description                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DB_URI`                                 | URI to the postgres database                                                                  |
| `SEQUELIZE_POOL_MAX_CONNECTIONS`         | Maximum number of connection in pool                                                          |
| `SEQUELIZE_POOL_MIN_CONNECTIONS`         | Minimum number of connection in pool                                                          |
| `SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS` | The maximum time, in milliseconds, that pool will try to get connection before throwing error |

#### AWS Settings

| Name                            | Description                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `AWS_REGION`                    | Region for the S3 bucket that is used to store file uploads                      |
| `SECRET_MANAGER_SALT`           | Secret used to generate names of credentials to be stored in AWS Secrets Manager |
| `ECS_SERVICE_NAME`              | Worker-specific: ECS service name used for finding the existing running tasks    |
| `ECS_CONTAINER_METADATA_URI_V4` | **Worker-specific**: URI injected by ECS Agent - **do not set manually**         |

For testing locally, you may need to configure your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to be able to call AWS APIs. In production, your server should be granted the IAM role with permissions to access resources directly.

#### Sending emails

If not set, `nodemailer-direct-transport` will be used (for testing locally)

| Name                      | Description                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `WORKER_SES_HOST`         | Amazon SES SMTP endpoint.                                                                                                  |
| `WORKER_SES_PORT`         | Amazon SES SMTP port, defaults to 465                                                                                      |
| `WORKER_SES_USER`         | SMTP username                                                                                                              |
| `WORKER_SES_PASS`         | SMTP password                                                                                                              |
| `WORKER_SES_FROM`         | The email address that appears in the From field of an email                                                               |
| `EMAIL_FALLBACK_ACTIVATE` | Switch to true to use the SendGrid fallback for all emails. Ensure that the SMTP settings are properly configured as well. |

#### Sending smses

| Name                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `SMS_FALLBACK_ACTIVATE`  | Switch to true to use SNS fallback for all SMS campaigns |
| `SMS_FALLBACK_SENDER_ID` | Sender ID to use for all SNS SMS                         |

This set of twilio credentials is used for testing locally only (ie, `NODE_ENV=development`). When in production, users will have to upload their credentials, which will be stored and retrieved from Secrets Manager.
If not set, smses cannot be sent.

| Name                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `TWILIO_ACCOUNT_SID`           | Id of the Twilio account                  |
| `TWILIO_API_KEY`               | API Key to access Twilio                  |
| `TWILIO_API_SECRET`            | Corresponding API Secret to access Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | ID of the messaging service               |
| `DEFAULT_COUNTRY_CODE`         | Country code to prepend to phone numbers  |

#### Message workers

| Name                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `MESSAGE_WORKER_SENDER` | Worker-specific: Number of sender workers. Defaults to 0 |
| `MESSAGE_WORKER_LOGGER` | Worker-specific: Number of logger workers. Defaults to 0 |
