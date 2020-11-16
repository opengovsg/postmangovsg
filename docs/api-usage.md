# Using the API

Currently, use of the API is limited to non-password protected campaigns only.

## Getting Started

The swagger docs are available at [https://api.postman.gov.sg/docs/](https://api.postman.gov.sg/docs/)
Using the console, **create an authorization token**. This token will be passed to all the following network requests. The examples below will create and send an Email campaign.
Try the other endpoints listed in the swagger docs to save credentials, create other types of campaigns, preview the campaign, stop and resume campaign.

### 1. Create a campaign (in this case, email)

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaigns' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"name": "name-of-email-project",
	"type": "EMAIL"
}'
```

### 2. Add a template to that campaign.

If step 1 returned campaign id 100, you would call the endpoint in this manner.

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

### 3.1. Get a presigned url that will let you upload your file of recipients to S3

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

### 3.2. Upload the file to the presigned url that was returned in step 3.1

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

### 3.3. After the file has been uploaded to S3, complete this process by requesting the backend to validate your file.

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

### 4. Send a test email to yourself for that campaign

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/credentials' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"recipient": "youremail@gmail.com"
}'
```

If you are sending a SMS or Telegram campaign, you will need to provide an additional `label` parameter in the request body. This label refers
to the label assigned to a credential when it was first added in the Settings page.

### 5. When you're ready to send the messages to everyone in the csv file you've uploaded, make a send request.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/send' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"rate": 10
}'
```
