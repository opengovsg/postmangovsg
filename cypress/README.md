## Set up credentials for local run

Set the Twilio credentials as environmental variables

| Name                        | Description               |
| --------------------------- | ------------------------- |
| `CYPRESS_TWILIO_ACC_SID`    | Twilio account SID        |
| `CYPRESS_TWILIO_AUTH_TOKEN` | Twilio account Auth Token |

Set the credentials for Gmail API call

- If you're a developer at OGP, obtain the `credentials.json` and `gmail_token.json.json` from 1Password.
- If you're not a developer at OGP, follow the steps to set up your Gmail API credentials
  - Create a project and an OAuth credential on Google Cloud Platform
  - Download the OAuth credentials file as `credentials.json` and add `"urn:ietf:wg:oauth:2.0:oob"` as a redirect URI
  - Make sure the Gmail API is activated for your account https://console.developers.google.com/apis/library/gmail.googleapis.com
  - To generate the OAuth token, run the following command
    ```bash
    > node <path-to-node_modules>/gmail-tester/init.js <path-to-credentials.json> <path-to-token.json> <target-email>
    ```
    Example:
    ```bash
    > node ../../node_modules/gmail-tester/init.js ./credentials.json gmail_token.json internal-use@open.gov.sg
    ```

## Set up other environmental variables

Make sure the environmental variables for cypress configuration match your test cases

| Name            | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `EMAIL`         | Email used to log into Postman and to receive emails                   |
| `SMS_NUMBER`    | Number used to receive SMS                                             |
| `MSG_CONTENT`   | Test message sent, variables should have a match in CSV files          |
| `MSG_TO_VERIFY` | Test message to verify, content should match MSG_CONTENT and CSV files |
| `DUMMY_ENC`     | Dummy password for encrypted email test, should match CSV file         |

Other variables used in tests (leave as default)

| Name              | Description                               |
| ----------------- | ----------------------------------------- |
| `REDIRECTION_MSG` | Redirect message used in encrypted emails |
| `OTP_SUBJECT`     | Subject of OTP emails sent by postman     |
| `MAIL_SENDER`     | Email address used by Postman             |
| `TIMEOUT`         | Time to wait while page loads             |
| `WAIT_TIME`       | Time to wait while emails/ sms are sent   |

Refer to the fixtures folder for CSV files used in tests.

## To run locally

```bash
> npm run cy:run
```
