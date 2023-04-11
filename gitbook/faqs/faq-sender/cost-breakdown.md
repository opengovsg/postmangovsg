---
description: >-
  PostmanSG does not charge the user. Sending emails are free. Sending SMS
  depends on Twilio's SMS pricing and the recipient's country code. Sending
  Telegram bot messages are free.
---

# Cost Breakdown

## Email

| Channel            | Email | Password Protected Email |
| ------------------ | ----- | ------------------------ |
| Recurrent cost ($) | $0    | $0                       |
| Operation cost ($) | $0    | $0                       |

## SMS

**Prerequisite**: Twilio account

Twilio provides simple and flexible [pricing plans](https://www.twilio.com/pricing) for different tiers of users. Please click [here](https://www.twilio.com/sms/pricing/sg) for the latest information on SMS cost. A U.S. phone number costs $1.15 USD per month. This is sufficient for Postman's current functionality of 1-way SMS from you to your recipients, as 2-way SMS communications are not currently supported by Postman.



| Twilio Payment Schemes  | What do you need?                  |
| ----------------------- | ---------------------------------- |
| Pay-as-you-go           | Corporate credit card              |
| Volume discount         | Procure by contacting Twilio sales |
| Committed-use discounts | Procure by contacting Twilio sales |

| Recurrent cost ($) | <p>USD $1.15 per phone line (US number)<br>USD $80 per phone line (Singapore number)</p> |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Operation cost ($) | USD $0.0415 (4.15 cents) per SMS                                                         |

### How to evaluate Twilio's product?

{% hint style="info" %}
Twilio's baseline send rate is 10 messages per second. You need to contact their sales team if you want a custom send rate for your use case.&#x20;
{% endhint %}

Figuring out what to get from Twilio is like selecting for your mobile plan from a Telco. It depends on your needs. The main considerations are:

1. Volume
2. Frequency

For example, if you are sending a campaign once daily and <1000 SMS at a time, then you don't need to buy multiple phone numbers or increase the baseline send rate of 10 messages per second. The default option is good enough for your use case. However, you are sending a campaign four times a day and at the volume of 50k SMS at a time then you might want to consider sending it at a higher rate. You need to contact Twilio sales to find out the cost of setting a higher send rate for your agency.&#x20;

## Telegram Bot

**Prerequisite**: Your own prepaid phone card that has Telegram installed on it.&#x20;

| Channel            | Telegram Bot                            |
| ------------------ | --------------------------------------- |
| Recurrent cost ($) | $x depending on your prepaid phone card |
| Operation cost ($) | $0                                      |

