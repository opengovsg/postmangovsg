const { IncomingWebhook } = require('@slack/webhook')
const Sentry = require('@sentry/node')
const config = require('./config')

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName = 'verify-backup-failure-notify-slack'
  scope.setTag('cloud-function-name', functionName)
})


const url = config.get('slackWebhookUrl')
const webhook = new IncomingWebhook(url);

/**
 * Triggered from a message on a Cloud Pub/Sub topic
 * dedicated for db dump restore failures
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.handler = async (event) => {
  console.log(event.data);

  await webhook.send({
    text: 'Verification of rds backup dump failed!',
  });
};
