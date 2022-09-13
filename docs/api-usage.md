# Using the API

## Table of Contents

1. [Getting started](#getting-started)
2. [Campaign-based API](#campaign-based-integration)
3. [Transactional API](#transactional-api)

## Getting Started

The swagger docs are available at [https://api.postman.gov.sg/docs/](https://api.postman.gov.sg/docs/).

Using the console, **create an authorization token**. This token will need to be be passed to all API calls.

This guide covers how to send emails using either the _transactional_ or _campaign-based_ API. Note that currently the use of the API is limited to non-password protected campaigns only.

Try out the other endpoints listed in the swagger docs to save credentials, create other types of campaigns, preview the campaign, stop and resume campaign.

## Campaign-based API

Usage of the campaign-based API is recommended if you need the following features:

- Delivery report
- Email template with variables substitution
- Send messages to multiple receipients at once

### 1. Create a campaign

In order to create an email campaign, make the following API call. For SMS and Telegram campaigns, replace `type` with `SMS` or `TELEGRAM` respectively.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaigns' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"name": "name-of-email-project",
	"type": "EMAIL"
}'
```

**Sample response**

```json
{
  "id": 100,
  "name": "name-of-email-project",
  "created_at": "2020-11-18T09:00:00.000Z",
  "type": "EMAIL",
  "protect": false,
  "demo_message_limit": null
}
```

Take note of the returned campaign ID (100) in the response as you will need it for the rest of the steps.

### 2. Add a message template to the campaign

#### 2.1 Email campaign

In addition to the message body, you will also need to provide a `subject` and an optional `reply_to` address for email campaign templates.

```bash
curl --location --request PUT 'https://api.postman.gov.sg/v1/campaign/100/template' \
--header 'Authorization: Bearer your_api_key' \
--header 'Content-Type: application/json' \
--data-raw '{
	"body": "Dear {{name}}, this is the content of my template.",
	"subject": "My template subject for {{name}}",
	"reply_to": "youremail@gmail.com"
}'
```

#### 2.2 SMS or Telegram campaign

Only the message body is required for SMS or Telegram campaign templates.

```bash
curl --location --request PUT 'https://api.postman.gov.sg/v1/campaign/100/template' \
--header 'Authorization: Bearer your_api_key' \
--header 'Content-Type: application/json' \
--data-raw '{
	"body": "Dear {{name}}, this is the content of my template.",
}'
```

### 3. Upload campaign recipients

#### 3.1. Get a presigned url that will let you upload your file of recipients to S3

You will need to include a base64 encoded MD5 checksum for the file that you are uploading when retrieving the presigned URL. This can be obtained from the command line by running the following:

```bash
$ cat /Users/owner/postman-sample.csv | openssl dgst -md5 -binary | base64
thisisanexamplemd5checksum
```

This MD5 checksum should then be included as part of parameters in the following GET request.

```bash
curl --location --request GET 'https://api.postman.gov.sg/v1/campaign/100/upload/start?mime_type=text/csv&md5=thisisanexamplemd5checksum' \
--header 'Authorization: Bearer your_api_key'
```

**Sample response**

```
{
    "presigned_url": "https://s3.ap-southeast-1.amazonaws.com/file-staging.postman.gov.sg/some_other_parameters",
    "transaction_id": "some_transaction_id"
}
```

#### 3.2. Upload the file to the presigned url that was returned in step 3.1

```bash
curl -i --location --request PUT 'https://s3.ap-southeast-1.amazonaws.com/file-staging.postman.gov.sg/some_other_parameters' \
--header 'Content-Type: text/csv' \
--header 'Content-MD5: thisisanexamplemd5checksum' \
--data-binary '@/Users/owner/postman-sample.csv'
```

**Sample response headers**

Take note of the value of the `ETag` header in the response. You will need to use it in the next step.

```
HTTP/1.1 200 OK
...
ETag: "thisisanetagvalue"
...
```

#### 3.3. After the file has been uploaded to S3, complete this process by requesting the backend to validate your file.

The values for `transaction_id` and `etag` were obtained from Step 3.1 and Step 3.2 respectively.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/upload/complete' \
--header 'Authorization: Bearer your_api_key' \
--header 'Content-Type: application/json' \
--data-raw '{
    "transaction_id": "some_transaction_id",
    "filename": "postman-sample.csv",
    "etag": "thisisanetagvalue"
}'
```

#### 3.4 Check processing status of uploaded file

```bash
curl --location --request GET 'https://api.postman.gov.sg/v1/campaign/100/upload/status' \
--header 'Authorization: Bearer your_api_key'
```

While the csv is being processed, `is_csv_processing` would be `true`. When `is_csv_processing` is`false`, this indicates that the csv processing is complete or an error has occurred. You can poll the `/upload/status` endpoint to refresh the file processing status.

**Sample response**

```json
{
  "is_csv_processing": true,
  "temp_csv_filename": "postman-sample.csv"
}
```

On successful file upload, `csv_filename` will reflect the uploaded file name. You can now proceed to the next step to validate your credentials.

**Sample response of successful file upload**

```json
{
  "csv_filename": "postman-sample.csv",
  "is_csv_processing": false,
  "num_recipients": 10,
  "preview": {
    "body": "Dear abc, this is the content of my template.",
    "subject": "My template subject for abc",
    "reply_to": "youremail@gmail.com"
  }
}
```

However if the file upload fails, `csv_error` will reflect the error message and you would need to repeat steps 3.1 - 3.4 again with a correct file. For example, the follwing response is returned if you uploaded an empty file.

**Sample response of failed file upload**

```json
{
  "csv_error": "Error: No rows were found in the uploaded recipient file. Please make sure you uploaded the correct file before sending.",
  "is_csv_processing": false,
  "num_recipients": 0,
  "temp_csv_filename": "postman-sample.csv"
}
```

### 4. Validate and assign campaign credentials

#### 4.1 Email campaigns

You do not need to provide any credentials for email campaigns. Make the following API call to send a test email and assign
Postman's default email credentials to your campaign.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/credentials' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"recipient": "youremail@gmail.com"
}'
```

#### 4.2 SMS campaigns

You will need to provide your own Twilio credentials to send a SMS campaign. For detailed instructions on how to retrieve or create these credentials
from your Twilio account, visit our [guide](https://guide.postman.gov.sg/quick-start/sms#find-twilio-credentials-on-twilio-console).

You may use either saved Twilio credentials or provide them during campaign creation. A test SMS will be sent to the phone number listed in the `recipient`
field in both options to validate the provided credentials.

**Using saved Twilio credentials**

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/credentials' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"label":"saved_credentials_label",
	"recipient":"+6588888888"
}'
```

**Providing Twilio credentials during campaign creation**

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/new-credentials/v2' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"twilio_account_sid": "ACxxx",
	"twilio_api_key": "SKxxx",
	"twilio_api_secret": "secret",
	"twilio_messaging_service_sid": "MGxxx",
	"recipient":"+6588888888"
}'
```

#### 4.3 Telegram campaigns

You will need to provide your Telegram bot token to send a Telegram campaign. For detailed instructions on how to create a Telegram bot and generate a
bot token, visit our [guide](https://guide.postman.gov.sg/quick-start/telegram-bot#create-a-telegram-bot-in-telegram).

You may use either a saved bot token or provide one during campaign creation.

**Using saved bot token**

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/credentials' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
    "label": "saved_bot_token_label"
}'
```

**Providing bot token during campaign creation**

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/new-credentials/v2' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
   "telegram_bot_token":"123123123123:xxxxxx"
}'
```

### 5. When you're ready to send the messages to everyone in the csv file you've uploaded, make a send request.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/send' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"rate": 10
}'
```

## Transactional API

Usage of the transactional API is recommended if you need the following features:

- Single API call to send email
- Reuse Postman.gov.sg's whitelisting to ensure deliverability to SGMail

Emails sent using the transactional API have the following limitations:

- There will be no delivery status available
- Email template will not be applied
- No variable substitution

### 1. Send email

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/transactional/email/send' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"subject": "Test email",
	"body": "<p>Hello <b>there</b></p>",
	"recipient": "user@agency.gov.sg",
	"from": "test@agency.gov.sg",
}'
```
## Send attachment

Postman API allows the sending of attachment. Here are a few things to note: 
- Your attachment has to pass our antivirus scan.
- Attachment should not exceed 2MB in size per email.
- You can only attach a maximum of 2 attachments per email.
- All attributes in your HTML will be stripped, except what is listed [here](https://github.com/opengovsg/postmangovsg/blob/15d1d853aa32457f17f400beef3e93249797f520/shared/src/templating/xss-options.ts#L30).
- Attachment format must be within the list of file types supported below.

**List of supported file types**
- asc
- avi
- bmp
- csv
- dgn
- doc
- docx
- dwf
- dwg
- dxf
- ent
- gif
- jpeg
- jpg
- mpeg
- mpg
- mpp
- odb
- odf
- odg
- ods
- pdf
- png
- ppt
- pptx
- rtf
- sxc
- sxd
- sxi
- sxw
- tif
- tiff
- txt
- wmv
- xls
- xlsx
  
  

