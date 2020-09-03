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

```bash
curl --location --request GET 'https://api.postman.gov.sg/v1/campaign/100/upload/start?mime_type=text/csv' \
--header 'Authorization: Bearer your_api_key'
```

**Sample response**

```
{
    "presigned_url": "https://s3.ap-southeast-1.amazonaws.com/file-staging.postman.gov.sg/some_other_parameters",
    "transaction_id": some_transaction_id"
}
```

### 3.2. Upload the file to the presigned url that was returned in step 3.1

```bash
curl --location --request PUT 'https://s3.ap-southeast-1.amazonaws.com/file-staging.postman.gov.sg/some_other_parameters' \
--header 'Content-Type: text/csv' \
--data-binary '@/Users/owner/postman-sample.csv'
```

### 3.3. After the file has been uploaded to S3, complete this process by requesting the backend to validate your file.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/upload/complete' \
--header 'Authorization: Bearer your_api_key' \
--header 'Content-Type: application/json' \
--data-raw '{
    "transaction_id": "some_transaction_id",
    "filename": "postman-sample.csv"
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

### 5. When you're ready to send the messages to everyone in the csv file you've uploaded, make a send request.

```bash
curl --location --request POST 'https://api.postman.gov.sg/v1/campaign/100/send' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your_api_key' \
--data-raw '{
	"rate": 10
}'
```
