/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars


const path = require('path');
const gmail = require('gmail-tester');

require('dotenv').config()

module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  
  on ("task", {
    "gmail:check": async args => {
      const { from, to, subject } = args;
      const email = await gmail.check_inbox(
        path.resolve(__dirname, "credentials.json"), // credentials.json is inside plugins/ directory.
        path.resolve(__dirname, "gmail_token.json"), // gmail_token.json is inside plugins/ directory.
        {
          subject: subject,
          from: from,
          to: to,
          wait_time_sec: 10,                                          // Poll interval (in seconds)
          max_wait_time_sec: 30,
          include_body: true
        }                                       // Maximum poll interval (in seconds). If reached, return null, indicating the completion of the task().
      );
      return email;
    }
  })

  config.env.TWILIO_ACC_SID = process.env.CYPRESS_TWILIO_ACC_SID
  config.env.TWILIO_AUTH_TOKEN = process.env.CYPRESS_TWILIO_AUTH_TOKEN
  return config
}
