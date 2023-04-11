---
description: >-
  What else do I need to know about Twilio via Postman, before I start using the
  service?
---

# The Basics

## Things to note:

* [**Send rate**](https://support.twilio.com/hc/en-us/articles/115002943027-Understanding-Twilio-Rate-Limits-and-Message-Queues): 10 SMSes per second by default, though for specific use cases this may be configured on Twilio.
* **Agency's own resource:** Each agency will need its own Twilio account to be able to send SMSes using Postman.
* **Record**: 144,000 SMSes in 1 batch
* **Maximum number of recipients through Postman**: No limit
* [**SMS character limit**](https://www.twilio.com/docs/glossary/what-sms-character-limit): 160 characters per message segment.&#x20;

## Billing & Cost

Twilio works like a prepaid phone, you have to top up credits before you can send SMS. Payment is done by credit card.

{% hint style="warning" %}
If you are unable to obtain a corporate credit card, you can explore direct invoicing with Twilio but note that you have to spend at least USD1,000 a month in order to qualify for this mode of payment. \
\
If you need help with payment issues, please contact your Twilio account manager or reach out to us to get connected to them.
{% endhint %}

When you first create your Twilio account, you will be given USD15.5 worth of free credits. You can use this to start test sending SMSes.&#x20;

_Note: Alphanumeric SenderID is not available on a free tier account_

**How much does sending a SMS cost on Twilio?**

At this point of writing (Jan 2023), it costs USD0.0415 per message segment of 160 characters. If your message is longer than 160 characters, you will be charged the cost of as many message segments.

You may refer to Twilio's [page](https://www.twilio.com/sms/pricing/sg) for the latest rates.&#x20;

**Purchasing a phone number (compulsory)**&#x20;

Similar to how you purchase phone line and prepaid cards, you have to purchase a phone number in order to send SMSes.&#x20;

A new phone number costs USD $1.15 per phone line for a US number. This is sufficient for Postman's current functionality of 1-way SMS from you to your recipients, as 2-way SMS communications are not currently supported by Postman.&#x20;

Comparatively, purchasing a Singapore number (which will allow 2-way SMS communications) will cost USD $80 per phone line.

For more details, go to [Cost Breakdown](https://guide.postman.gov.sg/faqs/faq-sender/cost-breakdown).&#x20;

## Twilio Credentials Required on Postman

In order to send SMSes using Postman, we need the following Twilio Credentials, which will be available once your Twilio account is set up. You will need to add these into your Postman dashboard to start using the SMS service on Postman.

* Account SID
* API Key
* API Secret
* Messaging Service ID

This is usually a one-time setup, unless there are changes in billing or you are deprecating the account.&#x20;
