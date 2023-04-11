# What is PostmanSG

PostmanSG is a mass messaging tool for the Singapore Government, officially launched on 14 May 2020.&#x20;

We've since sent out more than 78 million messages from over 90 agencies. This includes Quarantine Orders, Covid Test Results and Employer notices.&#x20;

Start using PostmanSG by logging in with an @agency.gov.sg email address!

## What can PostmanSG do?&#x20;

* **Easily customize messages to reach a wide audience**: Create a message template, upload a file containing customization parameters, and we will handle the rest for you.
* **Mass send emails**: Just click `send campaign` and Postman.gov.sg will send those messages out to your intended audience via email.
* **Mass send SMSes**: Enter your Twilio credentials under `settings`, and Postman.gov.sg will send those messages via SMS. No integration with Twilio is needed.
* **Mass send Telegram messages through a bot**: Get your recipients to subscribe to your Telegram bot and use Postman.gov.sg to send Telegram messages to the subscribers by uploading the subscriber's contact list.&#x20;
* **View stats**: Keep track of your campaign's progress as it is sending and check back when it is completed.

## Is PostmanSG secure?

Email and SMS are not 100% secure. We recommend that you don’t put any sensitive information in the email or SMS content. Some of our users generate a recipient-specific unique link that opens up to a locked page. We have completed our VAPT on June 15th, 2020, and fixed our vulnerabilities.&#x20;

## Can PostmanSG be accessed on the government intranet?

PostmanSG is only available on the internet at the moment.

## What data can PostmanSG handle?

When in doubt, you should follow IM8’s guidelines on data classification. We use cloud infrastructure so we are able to handle up to **restricted** data.&#x20;

| Normal email/SMS/Telegram | Non-sensitive to sensitivity low-normal | <ul><li>Transaction</li><li>Notification</li><li>Information broadcast</li><li>Receipts</li><li>Reminders</li></ul> |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Password-protected email  | Sensitivity high/restricted             | <ul><li>Covid-19 test result</li><li>Blood test result</li><li>Exam test result</li></ul>                           |

## Difference between the **API vs User Interface Access**

**API calls**: API stands for application programming interface. You need your engineers or IT support to help send your source database information to Postman.gov.sg through an API call. In order to use this feature, you need to generate an API key from `settings` in the Postman.gov.sg user interface and follow the [Swagger Doc](https://api.postman.gov.sg/docs/#/) to start sending Postman.gov.sg what you want to send through an API call.

**User Interface:** Users can access the user interface web app through [https://postman.gov.sg](https://postman.gov.sg). You can set your credentials for SMS under `settings` and start to send SMS and email campaigns right away.&#x20;

| Access Type                                                                                        | Channels                     | Type of Use Case             | Prerequisite                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [API ](https://github.com/opengovsg/postmangovsg/blob/master/docs/api-usage.md)                    | Email & SMS                  | System-generated             | Engineering or IT team to send messaging info from the source system to Postman.                                                                                                                           |
| [User Interface ](https://guide.postman.gov.sg/guide/getting-started)- Log in using postman.gov.sg | Email, SMS, and Telegram Bot | Manual intervention required | <p>@agency.gov.sg email access to log in</p><p><br>Fill out an access request <a href="https://go.gov.sg/postman-non-gov-sg-application">form</a> if you do not have an @agency.gov.sg email address. </p> |

## Open-source contribution

Postman.gov.sg is open-sourced. Visit our [GitHub repo](https://github.com/opengovsg/postmangovsg) to start contributing to our code. Contributing guidelines can be found [here](https://github.com/opengovsg/postmangovsg/blob/master/docs/CONTRIBUTING.md).

![](.gitbook/assets/github-icon-png-26.jpg)

