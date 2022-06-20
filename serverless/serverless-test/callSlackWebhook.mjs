import axios from "axios";

const client = axios.create({
  timeout: 4000,
});

const callSlackWebhook = async () => {
  const message =
    `*Postman Usage Statistics Digest*
 Number of agencies onboarded: XXX
 Number of campaigns conducted: YYY
 Total number of messages sent YESTERDAY:
 • SMS: 43241234
 • Email: 43241234
 • Telegram: 43241234
 blah blah blah`
  await client.post(SLACK_WEBHOOK_URL, {
    text: message,
  })
}

await callSlackWebhook()
