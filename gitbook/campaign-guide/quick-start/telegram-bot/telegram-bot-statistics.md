---
description: Go through this page to understand the stats from your campaign.
---

# Telegram Bot Statistics

You can download the list of Telegram recipients that failed to send on the stats page once the campaign is completed. See `export icon`.

![](../../../.gitbook/assets/telegram-stat-export.png)

## Types of Status for Telegram Bot

Telegram Bot campaigns would generate two types of status:

{% hint style="info" %}
1. **SENT**: Your Telegram message was sent successfully.
2. **ERROR**: Your Telegram message has failed to send.
{% endhint %}

You would not have any **INVALID** status (invalid status is for only for email). To see the entire list of errors you need to click on the `Export` button.

![](<../../../.gitbook/assets/postman-telegram-stat-2 (1).jpg>)

Once you click on the `Export` button, you will get a CSV file with the following columns.

![](../../../.gitbook/assets/postman-telegram-stat.jpg)

| Error Codes                       | Description & Follow-up Action                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1: Telegram ID not found**      | <p>Your recipient has not subscribed to your bot.<br><br><strong>Action</strong>: You need to ask your recipient to follow the <a href="https://guide.postman.gov.sg/guide/quick-start/telegram-bot/instructions-recipient-telegram">Instructions for Recipient Onboarding</a> to subscribe to your bot.</p>                                                                                |
| **2: Bot subscription not found** | <p>Your recipient has subscribed to one of our many agency bots on Postman but he or she is not subscribed to your agency's bot.<br><br><strong>Action</strong>: You need to ask your recipient to follow the <a href="https://guide.postman.gov.sg/guide/quick-start/telegram-bot/instructions-recipient-telegram">Instructions for Recipient Onboarding</a> to subscribe to your bot.</p> |
