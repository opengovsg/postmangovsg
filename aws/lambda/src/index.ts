import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import initDatabaseConnection from "./database/config";
import EmailBlacklist from "./database/models/email-blacklist";
import * as formSgPackage from "@opengovsg/formsg-sdk";
import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types";
import validator from "validator";
import { WebClient } from "@slack/web-api";

/**
 * Decrypted data has the following structure:
 *
 *     "responses": [
 *      {
 *          "signature": STRING,
 *          "_id": STRING,
 *          "question": STRING,
 *          "answer": "kishen@open.gov.sg",
 *          "fieldType": "email",
 *          "isUserVerified": true
 *      },
 *      {
 *          "_id": STRING,
 *          "question": "List of email addresses to whitelist, comma separated",
 *          "answer": "kishen@open.gov.sg",
 *          "fieldType": "textarea"
 *      }
 *  ]
 */
const getUserWhoSubmittedForm = (data: DecryptedContent) => {
  const emailResponse = data.responses.find(
    (response) => response.fieldType === "email"
  );
  return emailResponse?.answer;
};

const getListOfBlacklistedEmails = (data: DecryptedContent) => {
  const blacklistedEmailsString = data.responses.find(
    (response) => response.fieldType === "textarea"
  );
  const blacklistedEmailsList = blacklistedEmailsString?.answer?.split(",");
  const transformedBlacklistedEmailsList = blacklistedEmailsList?.map((email) =>
    email.trim().toLowerCase()
  );
  const filteredBlacklistedEmailList = transformedBlacklistedEmailsList?.filter(
    (email) => validator.isEmail(email)
  );

  return filteredBlacklistedEmailList ?? [];
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Received event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Received context: ${JSON.stringify(context, null, 2)}`);
  let slackClient;
  let formSubmissionId;
  try {
    // 1. Attempt to initialize slack client
    slackClient = new WebClient(process.env.SLACK_WEB_TOKEN);
  } catch (error) {
    console.log(`Failed to initialize slack client: ${error}`);

    // Return 200 to acknowledge webhook
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "hello world",
      }),
    };
  }
  try {
    // 2. Initialize dependencies
    console.log("Initializing dependencies");
    await initDatabaseConnection();
    const formSg = formSgPackage.default();

    // 3. Verify that the webhook was triggered by a form submission
    // If verification fails, an error is thrown
    console.log("Verifying function call");
    const formSgHeader = event.headers["x-formsg-signature"]!;
    // This is the URL of the lambda being invoked
    const webhookUrl = process.env.FORM_URL!;
    formSg.webhooks.authenticate(formSgHeader, webhookUrl);

    // 4. Get and decrypt the form submission contents
    console.log("Decrypting form contents");
    const rawFormSubmissionContent = event.body!;
    const parsedFormSubmissionContent = JSON.parse(rawFormSubmissionContent);

    const formSecretKey = process.env.FORM_SECRETS_KEY!;
    const decryptedFormSubmissionContent = formSg.crypto.decrypt(
      formSecretKey,
      parsedFormSubmissionContent.data
    );
    formSubmissionId = parsedFormSubmissionContent?.data.submissionId;
    console.log(`Submission ID: ${formSubmissionId}`);
    console.log(
      `Decrypted form contents: ${JSON.stringify(
        decryptedFormSubmissionContent
      )}`
    );

    // 5. Extract caller and blacklist information
    const formSubmissionUser = getUserWhoSubmittedForm(
      decryptedFormSubmissionContent!
    );
    const listOfBlacklistedEmails = getListOfBlacklistedEmails(
      decryptedFormSubmissionContent!
    );

    console.log(`Form submitted by: ${formSubmissionUser}`);
    console.log(`Blacklisted emails: ${listOfBlacklistedEmails}`);

    const emailsWhitelisted = [];
    const emailsNotFound = [];

    for (const email of listOfBlacklistedEmails) {
      console.log(`Attempting to remove ${email} from blacklist`);
      const res = await EmailBlacklist.destroy({
        where: {
          recipient: email,
        },
      });
      if (res) {
        console.log(`${email} removed from blacklist`);
        emailsWhitelisted.push(email);
      } else {
        console.log(`${email} not found in blacklist`);
        emailsNotFound.push(email);
      }
    }

    const slackMessage =
      `Submission by: ${formSubmissionUser}\n` +
      `Results:\n` +
      `Whitelisted emails count: ${emailsWhitelisted.length}\n` +
      `Whitelisted email: ${emailsWhitelisted}\n` +
      `Emails not found count: ${emailsNotFound.length}\n` +
      `Emails not found: ${emailsNotFound}\n`;

    await slackClient.chat.postMessage({
      channel: "C06JRRJPY3D",
      text: slackMessage,
    });
  } catch (error) {
    console.log(`An error occurred: ${error}`);

    const slackMessage =
      `Submission ID: ${formSubmissionId}\n` + `Error: ${error}`;

    await slackClient.chat.postMessage({
      channel: "C06JRRJPY3D",
      text: slackMessage,
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "hello world",
    }),
  };
};
