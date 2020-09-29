const { IncomingWebhook } = require('@slack/webhook')
require('dotenv').config()

const url = process.env.SLACK_WEBHOOK_URL;

if (!url) {
  throw new Error('SLACK_WEBHOOK_URL env var is missing!')
}

const webhook = new IncomingWebhook(url);

/**
 * Triggered from a message on a Cloud Pub/Sub topic
 * dedicated for db dump restore failures
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.helloPubSub = async (event) => {
  console.log(event.data);

  await webhook.send({
    text: 'Verification of rds backup dump failed!',
  });
};
