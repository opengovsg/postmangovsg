# Forking and configuring this product

- [Backend](#backend)
  - [Minimal environment variables](#minimal-environment-variables)
  - [Full set of environment variables that can be set](#full-set-of-environment-variables-that-can-be-set)
    - [General](#general)
    - [Database](#database)
    - [Cache](#cache)
    - [AWS Settings](#aws-settings)
    - [Login sessions](#login-sessions)
    - [OTP and API Keys](#otp-and-api-keys)
    - [Sending emails](#sending-emails)
    - [Sending smses](#sending-smses)

## Backend

Depending on the environment, a set of sane defaults for non-sensitive configuration can be found in

- [backend/src/core/config.ts](../../backend/src/core/config.ts).

Setting `NODE_ENV=development` or `NODE_ENV=staging` will override some defaults. If `NODE_ENV` is unset,
default `production` configuration is used.

These defaults can be modified as you wish or overridden with environment variables.

Sensitive configuration has to be set with environment variables.

### Minimal set of environment variables

| Name                  | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `DB_URI`              | URI to the postgres database                                                     |
| `REDIS_OTP_URI`       | URI to the redis cache for storing one time passwords                            |
| `REDIS_SESSION_URI`   | URI to the redis cache for storing login sessions                                |
| `SESSION_SECRET`      | Secret used to sign the session ID cookie                                        |
| `JWT_SECRET`          | Secret used to sign pre-signed urls for uploading CSV files to AWS S3            |
| `SECRET_MANAGER_SALT` | Secret used to generate names of credentials to be stored in AWS Secrets Manager |
| `API_KEY_SALT_V1`     | Secret used to hash API Keys before storing them in the database                 |

### Full set of environment variables that can be set

#### General

| Name               | Description                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`         | Set to `production` or `staging` for deployment                                                                                                                                  |
| `APP_NAME`         | Name of the app                                                                                                                                                                  |
| `DOMAIN_WHITELIST` | Semi-colon separated list of domains that can sign in to the app. Example: `.gov.sg;@xyz.abc.sg` will allow any emails ending in `@<agency>.gov.sg` and `@xyz.abc.sg` to sign in |
| `FRONTEND_URL`     | CORS: accept requests from this origin. Can be a string, or regex                                                                                                                |
| `MAX_RATE_PER_JOB` | Number of messages that one worker can send at a time                                                                                                                            |

#### Database

| Name                                     | Description                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DB_URI`                                 | URI to the postgres database                                                                  |
| `SEQUELIZE_POOL_MAX_CONNECTIONS`         | Maximum number of connection in pool                                                          |
| `SEQUELIZE_POOL_MIN_CONNECTIONS`         | Minimum number of connection in pool                                                          |
| `SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS` | The maximum time, in milliseconds, that pool will try to get connection before throwing error |

Further reference: [Sequelize documentation](https://sequelize.org/master/manual/connection-pool.html)

#### Cache

| Name                | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `REDIS_OTP_URI`     | URI to the redis cache for storing one time passwords |
| `REDIS_SESSION_URI` | URI to the redis cache for storing login sessions     |

#### AWS Settings

| Name                       | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| `AWS_REGION`               | Region for the S3 bucket that is used to store file uploads                      |
| `FILE_STORAGE_BUCKET_NAME` | Name of the S3 bucket that is used to store file uploads                         |
| `JWT_SECRET`               | Secret used to sign pre-signed urls for uploading CSV files to AWS S3            |
| `SECRET_MANAGER_SALT`      | Secret used to generate names of credentials to be stored in AWS Secrets Manager |
| `AWS_LOG_GROUP_NAME`       | Name of Cloudwatch log group to write application logs to                        |

For testing locally, you may need to configure your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to be able to call AWS APIs. In production, your server should be granted the IAM role with permissions to access resources directly.

#### Login sessions

| Name               | Description                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`   | Secret used to sign the session ID cookie                                                         |
| `COOKIE_NAME`      | Identifier for the cookie                                                                         |
| `COOKIE_DOMAIN`    | Specifies the value for the `Domain Set-Cookie` attribute                                         |
| `COOKIE_HTTP_ONLY` | Specifies the boolean value for the `HttpOnly Set-Cookie` attribute.                              |
| `COOKIE_SECURE`    | `true` will set a secure cookie that is sent only over HTTPS.                                     |
| `COOKIE_MAX_AGE`   | Specifies the number (in milliseconds) to use when calculating the `Expires Set-Cookie` attribute |
| `COOKIE_SAME_SITE` | `true` will set the `SameSite` attribute to Strict for strict same site enforcement.              |
| `COOKIE_PATH`      | Specifies the value for the `Path Set-Cookie`.                                                    |

Further reference: [Express-session documentation](https://www.npmjs.com/package/express-session)

#### OTP and API Keys

| Name                   | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `OTP_RETRIES`          | Number of attempts a user can enter otp before a new otp is required |
| `OTP_EXPIRY_SECONDS`   | Number of seconds before a new otp is required                       |
| `OTP_RESEND_SECONDS`   | Number of seconds before a user can resend a new otp                 |
| `API_KEY_SALT_V1`      | Secret used to hash API Keys before storing them in the database     |
| `API_KEY_SALT_VERSION` | Defaults to `v1`                                                     |

#### Sending emails

If not set, `nodemailer-direct-transport` will be used (for testing locally)

| Name       | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `SES_HOST` | Amazon SES SMTP endpoint.                                    |
| `SES_PORT` | Amazon SES SMTP port, defaults to 465                        |
| `SES_USER` | SMTP username                                                |
| `SES_PASS` | SMTP password                                                |
| `SES_FROM` | The email address that appears in the From field of an email |

Further reference: [AWS SES documentation](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/smtp-credentials.html)

#### Sending smses

This set of twilio credentials is used for testing locally only (ie, `NODE_ENV=development`). When in production, users will have to upload their credentials, which will be stored and retrieved from Secrets Manager.
If not set, smses cannot be sent.

| Name                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `TWILIO_ACCOUNT_SID`           | Id of the Twilio account                  |
| `TWILIO_API_KEY`               | API Key to access Twilio                  |
| `TWILIO_API_SECRET`            | Corresponding API Secret to access Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | ID of the messaging service               |
| `DEFAULT_COUNTRY_CODE`         | Country code to prepend to phone numbers  |

Further reference: [Twilio API Key documentation](https://www.twilio.com/docs/iam/keys/api-key-resource?code-sample=code-authenticate-with-api-key-and-api-secret)
