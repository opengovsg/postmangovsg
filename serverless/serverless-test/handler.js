"use strict";
const axios = require("axios");

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const client = axios.create({
  timeout: 4000,
});

module.exports.run = async (event, context) => {
  const message = await getRon();
  await client.post(SLACK_WEBHOOK_URL, {
      text: message,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    });
  const time = new Date();
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);
};

async function getRon() {
  const { data } = await client.get(
    "https://ron-swanson-quotes.herokuapp.com/v2/quotes"
  );
  return data[0];
}

