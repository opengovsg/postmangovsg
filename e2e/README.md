# End-to-end tests

## Set up credentials for local run

Set the Twilio credentials, email and sms_number used as environmental variables. Copy `.env-example` into `.env` and update the env vars accordingly.

If you're a developer at OGP, you can find our Postman testing env vars in our 1Password vault.

| Name                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `API_KEY`           | Your Postman account API key                         |
| `TWILIO_ACC_SID`    | Twilio account SID                                   |
| `TWILIO_AUTH_TOKEN` | Twilio account Auth Token                            |
| `MAILBOX`           | Email used to log into Postman and to receive emails |
| `SMS_NUMBER`        | Number used to receive SMS                           |

Set the credentials for Gmail API call

- If you're a developer at OGP, obtain the `credentials.json` and `gmail_token.json` from 1Password.
- Else, follow the steps to set up your Gmail API credentials

  - Create a project and an OAuth credential on Google Cloud Platform
  - Download the OAuth credentials file as `credentials.json` and add `"urn:ietf:wg:oauth:2.0:oob"` as a redirect URI
  - Make sure the Gmail API is activated for your account [here](https://console.developers.google.com/apis/library/gmail.googleapis.com)
  - To generate the OAuth token, run the following command

    ```bash
    > node <path-to-node_modules>/gmail-tester/init.js <path-to-credentials.json> <path-to-token.json> <target-email>
    ```

    Example:

    ```bash
    > node node_modules/gmail-tester/init.js ./credentials.json gmail_token.json internal-use@open.gov.sg
    ```

- Put both `credentials.json` and `gmail_token.json` in the e2e folder

## To run locally

- From the `e2e` folder, run `npm i`.
- From the root folder
  - To run the end-to-end tests directly: `npm run test`
  - To run in debug mode: `npm run test -- --debug` (for variants like running subset of tests or specifying browsers, [see here](https://playwright.dev/docs/debug#run-in-debug-mode-1))

Tip: If you're using VS Code, you can download the [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) and [write](https://www.youtube.com/watch?v=LM4yqrOzmFE) and [debug](https://playwright.dev/docs/debug#vs-code-debugger) your tests directly in VS Code.
