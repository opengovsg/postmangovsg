import args from "args";
import AWS from "aws-sdk";
import * as fs from "fs/promises";
import { parse } from "csv-parse/sync";
import Mustache from "mustache";
import bluebird from "bluebird";

const SNS_SMS_TYPE = "Transactional";
const BLUEBIRD_CONCURRENCY = 3;

// Set up command line args
args
  .option("csvPath", "The filepath to the CSV file to process")
  .option("templatePath", "The filepath to the template txt file")
  .option("senderId", "The sender ID name")
  .option("dryrun", "If dryrun is false (default), do not send out the SMSes");

const flags = args.parse(process.argv);

if (!flags.csvPath) {
  console.log("CSV filepath is required");
  exit(1);
}

if (!flags.templatePath) {
  console.log("Template filepath is required");
  exit(1);
}

if (!flags.senderId) {
  console.log("SMS sender ID is required");
  exit(1);
}

// Set region
AWS.config.update({ region: "ap-southeast-1" });

const generateTemplatedMessages = async (
  csvFilePath,
  templatePath,
  senderId,
  isDryrun
) => {
  const templateContent = await fs.readFile(templatePath, "utf8");
  const csvArray = await parseCsv(csvFilePath);
  console.log("Parsed CSV Array: ", csvArray);
  const templatedMessageArray = csvArray.map((variables) => {
    // Check if the phone number field starts with +. If it doesn't, add +65.
    const phoneNumber =
      variables.recipient.slice(0, 1) === "+"
        ? variables.recipient
        : "+65" + variables.recipient;
    return {
      phoneNumber,
      message: Mustache.render(templateContent, variables),
    };
  });

  console.log("Templated Message Array: ", templatedMessageArray);

  if (!isDryrun) {
    await bluebird.map(
      templatedMessageArray,
      ({ phoneNumber, message }) => {
        return publishSmsToSns(phoneNumber, message, senderId);
      },
      { concurrency: BLUEBIRD_CONCURRENCY }
    );
  }
};

const parseCsv = async (csvFilePath) => {
  const csvContent = await fs.readFile(csvFilePath);
  const parserConfig = {
    columns: true,
    skip_empty_lines: true,
  };

  return await parse(csvContent, parserConfig);
};

const publishSmsToSns = async (phoneNumber, message, senderId) => {
  // Create publish parameters
  const params = {
    Message: message /* required */,
    PhoneNumber: phoneNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: senderId,
      },
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: SNS_SMS_TYPE,
      },
    },
  };

  // Create promise and SNS service object
  const publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
    .publish(params)
    .promise();

  return publishTextPromise;
};

generateTemplatedMessages(
  flags.csvPath,
  flags.templatePath,
  flags.senderId,
  flags.dryrun === "true"
);
