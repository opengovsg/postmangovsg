# Postman Email Bruno collection

Requests for the Postman Email API (`/v1`). Open this folder in [Bruno](https://www.usebruno.com/) or run it with the Bruno CLI.

## Setup

1. Pick an environment: `Local` (`http://localhost:4000/v1`), `Staging` (`https://api-staging.postman.gov.sg/v1`) or `Production` (`https://api.postman.gov.sg/v1`).
   Use the `api-` hosts. `legacy-staging.postman.gov.sg` and `legacy.postman.gov.sg` serve the web app, which answers `/v1/*` with its HTML page and a `200`, so requests look like they succeed but never reach the API.
2. Set `apiKey` as a secret variable to use an API key, or run `Auth/Request OTP` and `Auth/Verify OTP and log in` to use a session cookie. See the collection docs for which routes take which.
3. Fill in `loginEmail`, `campaignId`, `emailId` and `apiKeyId` in the environment as you need them. Don't commit their values.

The default from address is `info@mail.postman.gov.sg`. Any other `from` address needs its identity or domain set up in SES first.

## Requests that send email

These send real email on staging and production:

- `Auth/Request OTP` (to `loginEmail`)
- `Transactional email/Send email` and `Send email with attachment`
- `Email campaign/Send test email`, `Send campaign` and `Retry campaign`
- `Settings/Verify custom from address` (confirmation email to `recipient`)

Nothing else sends email. The CSV upload requests only store the recipient list.

## Not included

| Route                                                          | Why it's left out                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `POST /callback/email`                                         | SES delivery events. The backend checks the SNS message signature and a basic-auth secret, so a hand-built request can't pass.   |
| `PUT`/`DELETE /unsubscribe/:campaignId/:recipient`             | Needs an HMAC (`h`, `v`) generated for each recipient.                                                                           |
| `GET /auth/one-gov-sg/login`, `POST /auth/one-gov-sg/callback` | one.gov.sg login is a browser redirect to the identity provider with server-side state and PKCE. Use `Auth/Request OTP` instead. |
| `POST /protect/:id`                                            | Needs a password hash for a protected message.                                                                                   |
| CSV upload to S3                                               | `Start CSV upload` returns a presigned S3 URL. The `PUT` of the file to that URL happens outside the Postman API.                |
| SMS, Telegram and GovSG routes                                 | Out of scope for this collection.                                                                                                |
