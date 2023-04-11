---
description: >-
  You can use Postman to send SMSes. The SMSes are sent through Twilio, our
  cloud communications service provider. You will need a Twilio account and a
  phone number to use this service via Postman.
---

# 📱SMS & Twilio

## \[New] Seamless Postman SMS onboarding!

We understand that onboarding to Twilio and senderID registration can be a hassle so we want to make this more seamless for you.&#x20;

We are launching Postman SMS onboarding in Beta to make it easy for government agencies to set up their SMS campaigns

If you would like to onboard, simply fill in a form on this [link](https://go.gov.sg/postman-sms-form).&#x20;

## What is Twilio?

[Twilio](https://www.twilio.com/) is a cloud communication service that allows the users to send messages through an Application Program Interface (API). You can go to [Twilio.com](https://www.twilio.com/) to sign up for an account.&#x20;

## Why did Postman choose Twilio as our service provider?

We evaluated other cloud service providers before we chose Twilio. We have used Twilio for SMS sending service for NDP ticketing, Digital MC, SGH's elective surgery appointment receipt and reminder, MOH's quarantine notice, and ICA's location checking for those who are on quarantine notice.

#### **Easy to set up & well-documented API**

Besides Twilio, we looked into other cloud-based SMS providers like Nexmo and AWS SNS. We chose Twilio because it has a simple user interface with an interactive debugger and its APIs are simple and well-documented. Our developers also have experience integrating with Twilio, making it easy for us to integrate with Twilio and saving significant man-hours on setting up our own SMS gateway.

#### **Reliability & availability**

Twilio API's success rate is 99.999% & uptime is around 99.95% monthly. Nexmo does not publicly declare its API success rate and uptime. AWS SNS does not publicly declare its API success rate but its uptime is \~99.90% (per month).

## How is Postman different from Twilio?

1. **User Interface**
   * Postman provides a user-friendly interface for users to easily access Twilio's services.
2. **API**
   * Optimizes the `rate limit` to send messages in bulk
   * Allows the user to `cancel` the campaign&#x20;
   * Allows the user to `retry` for messages that encounter errors during the first attempted delivery

## Can I trial using Postman for SMS before deciding whether to set up a Twilio account?

Yes! Postman provides users with the ability to create up to 3 [demo](../../before-you-start/demo-mode.md) SMS campaigns per account, at up to 20 SMSes per campaign. Simply log in with your .gov.sg email address to trial the SMS function on Postman!

## I have decided to use Postman to send SMSes. What do I need to do?

This guide will show you basic steps on how to set up a Twilio account. You can then key in your Twilio credentials into Postman (one-time entry) and start sending SMSes.

However, if you run into any difficulties during the set-up or procurement processes beyond what is shown in the guide, please [reach out](https://form.gov.sg/#!/62b19812ff209e00126f2c47) to us, and we will link you with our Twilio counterpart for their expertise.&#x20;

