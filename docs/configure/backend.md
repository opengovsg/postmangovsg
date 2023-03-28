# Forking and configuring this product

- [Forking and configuring this product](#forking-and-configuring-this-product)
  - [Backend](#backend)
    - [Minimal set of environment variables](#minimal-set-of-environment-variables)
    - [Full set of environment variables that can be set](#full-set-of-environment-variables-that-can-be-set)
      - [General](#general)
      - [Database](#database)
      - [Cache](#cache)
      - [AWS Settings](#aws-settings)
      - [Login sessions](#login-sessions)
      - [OTP and API Keys](#otp-and-api-keys)
      - [Sending emails](#sending-emails)
      - [Sending smses](#sending-smses)
      - [Transactional messages](#transactional-messages)
      - [Credential cache](#credential-cache)

## Backend

Depending on the environment, a set of sane defaults for non-sensitive configuration can be found in

- [backend/src/core/config.ts](../../backend/src/core/config.ts).

Setting `APP_ENV=development` or `APP_ENV=staging` will override some defaults. If `APP_ENV` is unset,
default `production` configuration is used.

These defaults can be modified as you wish or overridden with environment variables.

Sensitive configuration has to be set with environment variables.

### Minimal set of environment variables

| Name                   | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `DB_URI`               | URI to the postgres database                                                     |
| `REDIS_OTP_URI`        | URI to the redis cache for storing one time passwords                            |
| `REDIS_SESSION_URI`    | URI to the redis cache for storing login sessions                                |
| `REDIS_RATE_LIMIT_URI` | URI to the redis cache for rate limiting transactional requests                  |
| `REDIS_CREDENTIAL_URI` | URI to the redis cache for storing credentials                                   |
| `SESSION_SECRET`       | Secret used to sign the session ID cookie                                        |
| `JWT_SECRET`           | Secret used to sign pre-signed urls for uploading CSV files to AWS S3            |
| `SECRET_MANAGER_SALT`  | Secret used to generate names of credentials to be stored in AWS Secrets Manager |
| `API_KEY_SALT_V1`      | Secret used to hash API Keys before storing them in the database                 |
| `DD_ENV`               | Environment tag for datadog traces                                               |
| `DD_SERVICE`           | Service name tag for datadog traces (suggest: `postman`)                         |
| `DD_LOGS_INJECTION`    | Flag determining whether to inject `trace_id` to our logs (suggest: `true`)      |

### Full set of environment variables that can be set

#### General

| Name                           | Description                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                      | Set to `production` or `staging` for deployment                                                                                                                                  |
| `APP_NAME`                     | Name of the app                                                                                                                                                                  |
| `DOMAIN_WHITELIST`             | Semi-colon separated list of domains that can sign in to the app. Example: `.gov.sg;@xyz.abc.sg` will allow any emails ending in `@<agency>.gov.sg` and `@xyz.abc.sg` to sign in |
| `FRONTEND_URL`                 | CORS: accept requests from this origin. Can be a string, or regex                                                                                                                |
| `MAX_RATE_PER_JOB`             | Number of messages that one worker can send at a time                                                                                                                            |
| `CSV_PROCESSING_TIMEOUT_IN_MS` | Maximum permissible time for csv processing before it is marked as timed out (defaults to 10 mins)                                                                               |

#### Database

| Name                                     | Description                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DB_URI`                                 | URI to the postgres database                                                                  |
| `SEQUELIZE_POOL_MAX_CONNECTIONS`         | Maximum number of connection in pool                                                          |
| `SEQUELIZE_POOL_MIN_CONNECTIONS`         | Minimum number of connection in pool                                                          |
| `SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS` | The maximum time, in milliseconds, that pool will try to get connection before throwing error |

Further reference: [Sequelize documentation](https://sequelize.org/master/manual/connection-pool.html)

#### Cache

| Name                   | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `REDIS_OTP_URI`        | URI to the redis cache for storing one time passwords |
| `REDIS_SESSION_URI`    | URI to the redis cache for storing login sessions     |
| `REDIS_RATE_LIMIT_URI` | URI to the redis cache for rate limiting requests     |

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

| Name                      | Description                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_SES_HOST`        | Amazon SES SMTP endpoint.                                                                                                  |
| `BACKEND_SES_PORT`        | Amazon SES SMTP port, defaults to 465                                                                                      |
| `BACKEND_SES_USER`        | SMTP username                                                                                                              |
| `BACKEND_SES_PASS`        | SMTP password                                                                                                              |
| `BACKEND_SES_FROM`        | The email address that appears in the From field of an email                                                               |
| `EMAIL_FALLBACK_ACTIVATE` | Switch to true to use the SendGrid fallback for all emails. Ensure that the SMTP settings are properly configured as well. |

Further reference: [AWS SES documentation](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/smtp-credentials.html)

#### Sending smses

| Name                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `SMS_FALLBACK_ACTIVATE`  | Switch to true to use SNS fallback for all SMS campaigns |
| `SMS_FALLBACK_SENDER_ID` | Sender ID to use for all SNS SMS                         |

This set of twilio credentials is used for testing locally only (ie, `APP_ENV=development`). When in production, users will have to upload their credentials, which will be stored and retrieved from Secrets Manager.
If not set, smses cannot be sent.

| Name                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `TWILIO_ACCOUNT_SID`           | Id of the Twilio account                  |
| `TWILIO_API_KEY`               | API Key to access Twilio                  |
| `TWILIO_API_SECRET`            | Corresponding API Secret to access Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | ID of the messaging service               |
| `DEFAULT_COUNTRY_CODE`         | Country code to prepend to phone numbers  |

Further reference: [Twilio API Key documentation](https://www.twilio.com/docs/iam/keys/api-key-resource?code-sample=code-authenticate-with-api-key-and-api-secret)

#### Transactional messages

| Name                         | Description                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `TRANSACTIONAL_EMAIL_RATE`   | The max number of transactional emails that can be requested per window per user. |
| `TRANSACTIONAL_EMAIL_WINDOW` | The duration of each window for transactional emails in seconds.                  |

#### Credential cache

| Name                              | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `TWILIO_CREDENTIAL_CACHE_MAX_AGE` | The maximum age in milliseconds of each cached Twilio credential. |
