# API Documentation

## Getting Started

This guide covers **how to send emails** using the _programmatic_ _API_.

### Pre-requisite

Make sure that you have generated the [bearer token](broken-reference) as you will need it to be passed to all API calls.

### Response Codes

Postman uses conventional API Responses Codes to indicate the success or failure of an API request.

{% hint style="info" %}
Response codes do not tell you the delivery status or if your emails are sent. You should be calling the [status](https://api.postman.gov.sg/docs/#/Email/get\_transactional\_email) endpoint.&#x20;
{% endhint %}

| Code | Description                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 201  | Created. The message is being sent.                                                                                                                                                                 |
| 400  | Bad Request. Failed parameter validations, message is malformed, or attachments are rejected.                                                                                                       |
| 401  | Unauthorised                                                                                                                                                                                        |
| 403  | Forbidden. Request violates firewall rules.                                                                                                                                                         |
| 413  | Number of attachments or size of attachments exceeded limit.                                                                                                                                        |
| 429  | Rate limit exceeded. Too many requests.                                                                                                                                                             |
| 500  | <p>Internal Server Error. <br>This includes error such as custom domain passed email validation but is incorrect; see <a href="https://github.com/opengovsg/postmangovsg/issues/1837">here</a>.</p> |

### Programmatic Email API

Usage of the programmatic API is recommended if you need the following features:

* Single API call to send email
* File attachments (more on this below)

Note the following if you are using the programmatic email API:

* Email template will not be applied
* No variable substitution
* Only whitelisted HTML attributes will be allowed (see [here](https://github.com/opengovsg/postmangovsg/blob/15d1d853aa32457f17f400beef3e93249797f520/shared/src/templating/xss-options.ts#L30) for full list)

#### Rate Limit

The default rate limit of our API is 10 message/s

This is configurable so if you think we require higher rate limit, feel free to reach out to us.&#x20;

#### Sending attachment through programmatic email API&#x20;

Postman API allows the sending of attachment. Here are a few things to note:

* Attachment should not exceed 2MB in size
* You can only attach a maximum of 5 attachments per email
* Attachment format must be within the list of file types (see the full list below).
* This is only available to users who has configured custom domain. ie. sending from your own domain. If you'd like to configure the emails to send from your own domain, reach out to [us](https://go.gov.sg/postman-contact-us) to find out more details.&#x20;

<details>

<summary><strong>List of supported file types</strong></summary>

* asc
* avi
* bmp
* csv
* dgn
* docx
* dwf
* dwg
* dxf
* ent
* gif
* jpeg
* jpg
* mpeg
* mpg
* mpp
* odb
* odf
* odg
* ods
* pdf
* png
* pptx
* rtf
* sxc
* sxd
* sxi
* sxw
* tif
* tiff
* txt
* wmv
* xlsx

</details>

For more details on usage, refer to our Swagger docs [here](https://api.postman.gov.sg/docs/#/Email/post\_transactional\_email\_send)

#### Send email

Without attachments

```
curl --location --request POST 'https://api.postman.gov.sg/v1/transactional/email/send' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
  "subject": "Test email",
  "body": "<p>Hello <b>there</b></p>",
  "recipient": "user@agency.gov.sg"
}'
```

With 1 attachment

```
curl --location --request POST 'https://api.postman.gov.sg/v1/transactional/email/send' \
--header 'Authorization: Bearer your_api_key' \
--form 'body="<p>Hello <b>there</b></p>"' \
--form 'recipient="user@agency.gov.sg"' \
--form 'attachments=@"/your/local/path-to-file"' \
--form 'subject="Test email"'
```

With multiple attachments

```
curl --location --request POST 'https://api.postman.gov.sg/v1/transactional/email/send' \
--header 'Authorization: Bearer your_api_key' \
--form 'body="<p>Hello <b>there</b></p>"' \
--form 'recipient="user@agency.gov.sg"' \
--form 'attachments=@"/your/local/path-to-file-1"' \
--form 'attachments=@"/your/local/path-to-file-2"' \
--form 'subject="Test email"'
```

#### Email Statuses

You can get the delivery status of the emails sent using the `GET`endpoint `/transactional/email`. \
\
Below is a list of statuses you might receive and what it means.

| Status      | Definition                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNSENT`    | initial state of a newly created transactional email (this status is not returned in the course of a successful request to send an email)                                                                                                                           |
| `ACCEPTED`  | email has been accepted by our email provider (this status is returned in the course of a successful request to send an email)                                                                                                                                      |
| `SENT`      | the send request was successfully forwarded to our email provider and our email provider will attempt to deliver the message to the recipient’s mail server (API user can check this and all subsequent statuses via the `/transactional/email/{emailId}` endpoint) |
| `BOUNCED`   | the recipient's mail server rejected the email                                                                                                                                                                                                                      |
| `DELIVERED` | the email provider has successfully delivered the email to the recipient's mail server                                                                                                                                                                              |
| `OPENED`    | the recipient received the message and opened it in their email client                                                                                                                                                                                              |
| `COMPLAINT` | the email was successfully delivered to the recipient’s mail server, but the recipient marked it as spam                                                                                                                                                            |

#### Sending through your own custom email domain

By default, your emails will be sent from donotreply@mail.postman.gov.sg domain.

If you would like to send through your own email domain, there are additional configurations you need to do on your DNS. You may refer to this [page](api-faq.md#how-to-set-up-custom-domain) for more details. &#x20;

### Programmatic SMS API

_Twilio has_ [_really good API documentation_](https://www.twilio.com/docs/sms) _so we  recommend that you integrate with Twilio directly._&#x20;

_If you prefer to use Postman Programmatic SMS API, you may find the Programmatic SMS API endpoints on our_ [_Swagger Docs_](https://api.postman.gov.sg/docs/#/SMS/post\_transactional\_sms\_send)_._&#x20;

_If you have additional enquiries or potential use cases using the Campaigns API, please_ [_contact us_](https://go.gov.sg/postman-contact-us)_._&#x20;

###







###
