const { defineConfig } = require('cypress');
const path = require('path');
const gmail = require('gmail-tester');

require('dotenv').config();

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://staging.postman.gov.sg/',
    video: false,
    env: {
      MSG_TO_VERIFY: 'Dear postman',
      MSG_CONTENT: 'Dear {{}{{}name{}}{}}',
      REDIRECTION_MSG:
        'Dear {{}{{}recipient{}}{}}, please access via {{}{{}protectedlink{}}{}}',
      OTP_SUBJECT: 'One-Time Password (OTP) for Postman.gov.sg',
      DUMMY_ENC: 'hello',
      TIMEOUT: 100000,
      WAIT_TIME: 10000,
      EMAIL: 'internal-use@open.gov.sg',
      MAIL_SENDER: 'donotreply@mail.postman.gov.sg',
      SMS_NUMBER: '+13254238044',
      TWILIO_ACC_SID: process.env.CYPRESS_TWILIO_ACC_SID,
      TWILIO_AUTH_TOKEN: process.env.CYPRESS_TWILIO_AUTH_TOKEN,
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
      });
      return config;
    },
  },
});
