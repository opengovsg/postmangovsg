<a href="https://postman.gov.sg"><img src="frontend/src/assets/img/app-logo.svg" title="Postman" alt="Postman.gov.sg"></a>


# Postman.gov.sg

> Postman.gov.sg enables public officers to send templated messages to many recipients.

## Table of Contents

## Features
- **Passwordless login**: login with your .gov.sg email
- **Easily customize messages to reach a wide audience**: create a message template, upload a file containing customization parameters and we will handle the customization for you
- **Send emails**: Just click send and Postman will send those messages out to your intended audience via email
- **Send SMSes**: Enter your twilio credentials, and Postman will send those messages via SMS. No integration with twilio is necessary
- **View stats**: Keep track of your campaign's progress as it's sending, and check back when it's done.

## Development

### Install and run required services
Set up a **postgresql@11** database and **redis** cache

```bash
# Install postgres
brew install postgresql@11
brew services start postgresql@11

# Create the database
createdb postmangovsg_dev

# Check if you can connect to the database
psql -h localhost -p 5432 postmangovsg_dev

# Install redis
brew install redis
brew services start redis

# Check that redis is running
redis-cli ping
```

### Set environment variables
Example environment variables can be found in
- `backend/.env-example`
- `frontend/.env-example`
- `worker/.env-example`

Set the environment variables in a file named `.env` in each folder

### Install and run the app

```bash
cd postmangovsg
npm install
npm run dev
```

## Deployment

We use TravisCI to simplify our deployment process: 
- `backend` is deployed on Elastic Beanstalk
- `frontend` is deployed on AWS Amplify
- `worker` is deployed on Elastic Container Service

The environment variables on Travis are:
- `AWS_ACCESS_KEY_ID` : access key for the travis IAM user
- `AWS_SECRET_ACCESS_KEY` : access key for the travis IAM user
- `AWS_DEFAULT_REGION` : region where your infrastructure is deployed (`ap-northeast-1` for us)
- `REPO`: Path to the elastic container registry (`<account_id>.dkr.ecr.ap-northeast-1.amazonaws.com/<repo_name>`)
- `PRODUCTION_BRANCH` : branch that is deployed to production
- `STAGING_BRANCH`: branch that is deployed to staging. Change this variable to test different branches.

To deploy workers, trigger a custom build on Travis with the Custom Config set to
```
env:
  - DEPLOY_WORKER=true
```

## Infrastructure customizations

#### Amplify rewrite rule

```
[
    {
        "source": "</^[^.]+$|\\\\\\\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf)$)([^.]+$)/>",
        "target": "/index.html",
        "status": "200",
        "condition": null
    }
]
```

#### Elastic Container Service

Create a cluster with four services. These names are currently hardcoded for deployment in .travis.yml

|Cluster Name: postmangovsg-workers|
|--|

|Service Name|LaunchType|Platform version|
|--|--|--|
|staging-sending|FARGATE|1.4.0|
|staging-logger|FARGATE|1.4.0|
|prod-sending|FARGATE|1.4.0|
|prod-logger|FARGATE|1.4.0|

## Architecture

## How it sends messages

## Contributions

