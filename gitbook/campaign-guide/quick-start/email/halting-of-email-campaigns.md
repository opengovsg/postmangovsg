---
description: >-
  Please read through this guide to understand the difference between hard and
  soft bounces, as well as halted campaigns.
---

# Bounced Emails and Halted Campaigns

## What are the different kinds of bounce?

Emails like abc@gmail.com may look like a well-formatted email address, but if it is not managed by a real human being, services like Google will send a bounce message when the email is sent out. This is considered a hard bounce, which increases PostmanSG's bounce rate and negatively affects PostmanSG's reputation score.

1. **Hard bounce:** Invalid email addresses.&#x20;
2. **Soft bounce:** Out-of-office messages or message notifications that the recipient's email inbox is full.&#x20;

## What is the impact of a hard bounce?

Hard bounce affects PostmanSG's reputation score. A reputation score is a measure of the email service reputation. **PostmanSG needs to maintain a low bounce rate in order to have a good reputation score.** Think of this as having good credit from the bank. Banks need you to have a good credit score in order to provide a credit card for transactions. Similarly, PostmanSG needs a good reputation score to send emails to Internet Service Providers (ISPs) in order to deliver emails to recipients.&#x20;

## What do you need to do as a user to help PostmanSG retain a good reputation score?

We need your help as a user to ensure that your mailing list is clean before you send an email campaign through our service. We understand that the first email campaign that you send out might contain a lot of invalid email addresses, but we ask you to use the bounce list once your campaign is over to clean and maintain your contact list. &#x20;

## Why is my campaign halted?

A campaign will be halted when there are too many hard bounces (due to invalid email addresses, which are addresses that do not exist), and will affect Postman's reputation score.

Postman encourages all users to maintain clean contact lists as a best practice, which means that email addresses should be valid and subscribed to the mailing list.&#x20;

To ensure that your campaign will not be halted, especially campaigns of high time sensitivity and urgency, please check that your mailing lists are clean before uploading them in CSV format to your Postman campaign:

1. check with your source system to ensure that no invalid addresses are included in the list e.g. non-existent email addresses, misspelled email addresses.
2. unsubscribe requests are adhered to - it is also good practice to remove unsubscribers when the request is received, though discretion of doing so is left to the agency in case of critical content.&#x20;

If your halted campaign has high time sensitivity or high urgency (e.g. impact on MoP is high/ops will be severely impaired if campaign is not immediately sent out), please [contact us](https://form.gov.sg/#!/62b19812ff209e00126f2c47) for assistance.&#x20;

## What are some ways to ensure my contact list is clean?

Here are some tips in building and maintaining your mailing list:

1. **Ensuring verified email collection upstream**: Consider using FormSG’s `verified email field` to collect email addresses from the intended recipients. This will ensure that you only collect email addresses from people who have access to the email account.
2. **Remove invalid email addresses from your mailing list**: We know that email addresses can become invalid over time when recipients change email addresses. You should always clean your mailing list regularly. You can do this easily with our export button on the campaign dashboard page. If an email campaign has bounced emails (hard bounce), it will be captured in the .csv file.&#x20;
3. **Check for formatting errors:** Make sure that the format for the email is correct, e.g. recipient@example.com. You can use this [tool](https://observablehq.com/@jeantanzj/email-validation) to do a quick check for any major formatting problems.&#x20;

{% hint style="warning" %}
Do not collect emails through Zoom registration forms. We know from experience that people do not put in their real emails in these forms.&#x20;
{% endhint %}

## Commercial tool to clean your mailing list

{% hint style="info" %}
You can consider using [Debounce.io](https://debounce.io/) to validate your mailing list.\
\
We have used Debounce.io's service for testing our mailing list. We found that [Debounce.io](https://debounce.io/) had \~62% for sensitivity and 97% for specificity for identifying invalid emails. It is a good service to consider if you know that you have an unclean mailing list.\
\
They are [GDPR](https://debounce.io/gdpr/) compliant and you can delete the contact list easily in their console. Write to your CIO to get approval and state the reason why you need to use this service. You can use the materials on this site to justify the need to maintain and clean your mailing list.&#x20;
{% endhint %}

