# Serverless
See [verify-backup-docs](verify-backup/README.md) for details on `verify-backup`

See [eb-env-update-docs](eb-env-update/README.md) for details on `eb-env-update`

TODO: Include README for `redaction-digest` and `database-backup`

The serverless functions are deployed onto Lambda. For more details on how the serverless functions are set up and how they work, see [here](https://docs.google.com/document/d/1ZYvCKgQK5DhZAO1MkxF5le0nplHYVmi08MRWXia0UQw).

* [Unsubscribe Email Digest](#unsubscribe-email-digest)
    + [Overview](#overview)
    + [Environment variables](#environment-variables)

## Unsubscribe Email Digest
`unsubscribe-email-digest` consolidates unsubscribed recipients for campaigns for each user. This lambda can be scheduled to run at weekly schedule in Cloudwatch Events.

### Overview
The `unsubscribers` table stores unsubscribed recipients by `campaign_id` and `sent_at` time which indicates if the recipient has already been included in an unsubscribe digest. 

`unsubscribe-email-digest` retrieves all unsubscribed recipients and consolidated them by campaign for each user. Every user with unsubscribed recipients are sent an email with this digest. The `unsubscribers` table is updated to reflect the email digest `sent_at` time.

### Environment variables
| Name                    | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| `CRONITOR_CODE`         | Cronitor code for unsubscribe-email-digest                   |
| `DB_URI`                | URI to the postgres database                                 |
| `DB_READ_REPLICA_URI`   | URI to the postgres read replica database                    |
| `DB_USE_IAM`            | Boolean for whether DB uses IAM (?)                          |
| `SENTRY_DSN`            | Sentry DSN for serverless                                    |
| `SES_HOST`              | Amazon SES SMTP endpoint.                                    |
| `SES_PORT`              | Amazon SES SMTP port, defaults to 465                        |
| `SES_USER`              | SMTP username                                                |
| `SES_PASS`              | SMTP password                                                |
| `SES_FROM`              | The email address that appears in the From field of an email |
| `UNSUBSCRIBE_GUIDE_URL` | URL to unsubscribe guide                                     |

## Telegram handler
To be updated
