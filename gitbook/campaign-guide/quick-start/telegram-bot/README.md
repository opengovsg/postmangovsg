# 🤖 Telegram Bot

## The basics

* **Send rate**: 30 Telegram messages per second
* **Max number of recipient**: No limit

### What is Telegram?

Telegram is a cloud-based instant messaging and voice over IP service. Telegram client apps are available for Android, iOS, Windows Phone, Windows, macOS and Linux. Users can send messages and image links to recipients using Postman's service.&#x20;

## Prerequisite

You need a pre-paid phone card with Telegram App installed.&#x20;

## Cost

Go to [Cost Breakdown](https://guide.postman.gov.sg/faqs/faq-sender/cost-breakdown).&#x20;

## Does PostmanSG send messages to everyone who subscribes to the bot?

You can control who you contact through your Telegram bot by uploading the mobile number of the recipients. Postman converts the phone number you uploaded to Telegram user IDs and sends your message to Telegram bot subscribers.

## Create a Telegram Bot in Telegram

{% embed url="https://youtu.be/meKbBBeMrc4" %}

### Step 1. Set up a bot

Use a dedicated phone card to create an official Telegram account. You can buy a pre-paid phone card. You need to keep the number and pre-paid phone card active.&#x20;

{% hint style="warning" %}
**It is highly recommended for the agency to use a shared pre-paid phone card for the Telegram bot creation**. This ensures that you do not have to transfer the ownership of the bot when there are personnel changes over time. If you need to change the phone number linked to your Telegram account, you can follow the instructions [here](https://telegram.org/faq#q-how-do-i-change-my-phone-number).&#x20;
{% endhint %}

### Step 2. Message BotFather on Telegram to set up a bot

![](<../../../.gitbook/assets/image (2).png>)

1. Start messaging BotFather ([https://telegram.me/BotFather](https://telegram.me/BotFather)) on Telegram and then type  `/start`.
2. You’ll see a list of commands that help you create, edit, and manage your bots. Since it’s your first time, type `/newbot`.
3. After giving the `/newbot` command, you get to pick a name and username for your bot. The name is what your users will see the bot as in their contact list and the username is how they’ll find it.&#x20;
4. With that done, you’ll be given your bot’s API token. The API token is how Telegram knows the message you send through PostmanSG is associated with this particular bot. Every bot has its own API token, and you shouldn’t share it with anyone or they could hijack your bot.
5. Keep the `t.me/[your bot name]` link that is the link that you will be sending out to your recipient to subscribe to your bot.&#x20;

