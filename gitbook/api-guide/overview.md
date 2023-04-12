---
description: This page is under construction
---

# Overview

## Programmatic APIs

\[This section is under construction]

## Campaign APIs

Our Campaign APIs are meant to support our users who access us via the frontend on Postman.gov.sg and are not designed to be accessed programmatically. You may find their endpoints in our [Swagger Docs](https://api.postman.gov.sg/docs/) and they might be modified without prior notice. As such, we recommend that you <mark style="background-color:yellow;">speak with us</mark> regarding your use case and use these APIs at your own risk.

{% embed url="https://api.postman.gov.sg/docs/" %}
Access our swagger docs for all the API endpoints available
{% endembed %}

{% hint style="info" %}
Campaign APIs currently do not support non-password protected campaigns only.
{% endhint %}

_If you have additional enquiries or potential use cases using the Campaigns API, please_ [_contact us_](https://go.gov.sg/postman-contact-us)_._

## Programmatic APIs vs Campaign APIs

| Type                   | Programmatic APIs                                        | Campaign APIs                                            |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| **How it works**       | Sends to one recipient at a time                         | Bulk sends to multiple recipients at once                |
| **Examples use cases** | Application approval, OTP, email receipt, reminders etc. | Mass event invitation, mass broadcast of a policy update |
