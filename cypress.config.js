const { defineConfig } = require('cypress');
const path = require('path');
const gmail = require('gmail-tester');
const fs = require('fs');

require('dotenv').config();

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://staging.postman.gov.sg/',
    video: false,
    defaultCommandTimeout: 20000,
    retries: 2,
    trashAssetsBeforeRuns: true,
    env: {
      MSG_TO_VERIFY: 'Dear postman',
      MSG_CONTENT: 'Dear {{}{{}name{}}{}}',
      REDIRECTION_MSG:
        'Dear {{}{{}recipient{}}{}}, please access via {{}{{}protectedlink{}}{}}',
      OTP_SUBJECT: 'One-Time Password (OTP) for Postman.gov.sg',
      DUMMY_ENC: 'hello',
      WAIT_TIME: 10000,
      REPORT_WAIT_TIME: 70000,
      MAIL_SENDER: 'donotreply@mail.postman.gov.sg',
      EMAIL: process.env.CYPRESS_EMAIL,
      SMS_NUMBER: process.env.CYPRESS_SMS_NUMBER,
      TWILIO_ACC_SID: process.env.CYPRESS_TWILIO_ACC_SID,
      TWILIO_AUTH_TOKEN: process.env.CYPRESS_TWILIO_AUTH_TOKEN,
      API_BASE_URL:
        process.env.CYPRESS_API_BASE_URL ||
        'https://api-staging.postman.gov.sg/',
      API_KEY: process.env.CYPRESS_API_KEY,
    },
    setupNodeEvents(on, config) {
      on('task', {
        'gmail:check': async (args) => {
          const { from, to, subject } = args;
          const email = await gmail.check_inbox(
            path.resolve(__dirname, 'credentials.json'), // credentials.json is inside plugins/ directory.
            path.resolve(__dirname, 'gmail_token.json'), // gmail_token.json is inside plugins/ directory.
            {
              subject: subject,
              from: from,
              to: to,
              wait_time_sec: 10, // Poll interval (in seconds)
              max_wait_time_sec: 30,
              include_body: true,
            }, // Maximum poll interval (in seconds). If reached, return null, indicating the completion of the task().
          );
          return email;
        },
        findDownloaded: async (path) => {
          return fs.readdirSync(path);
        },
      });
      return config;
    },
  },
});
