<a href="https://postman.gov.sg"><img src="frontend/src/assets/img/brand/app-logo.svg" title="Postman" alt="Postman.gov.sg"></a>

# Postman.gov.sg

> Postman.gov.sg enables public officers to send templated messages to many recipients.

## Table of Contents

- [Features](#features)
- [API Usage](#api-usage)
- [Development](#development)
  - [Install and run required services](#install-and-run-required-services)
  - [Secrets detection](#secrets-detection)
  - [Set environment variables](#set-environment-variables)
  - [Install dependencies](#install-dependencies)
  - [Compile frontend translations](#compile-frontend-translations)
  - [Run the app](#run-the-app)
- [Deployment](#deployment)
- [Releasing](#releasing)
- [Serverless](#serverless)
- [Downtime procedure](#downtime-procedure)
- [Infrastructure customizations](#infrastructure-customizations)
  - [Amplify rewrite rule](#amplify-rewrite-rule)
  - [Elastic Container Service](#elastic-container-service)
- [Architecture](#architecture)
- [Local node module](#local-node-module)
- [How messages are sent](#how-messages-are-sent)
- [Forking and configuring this product](#forking-and-configuring-this-product)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Worker](#worker)
- [Contributions](#contributions)

## Features

- **Passwordless login**: login with your .gov.sg email
- **Easily customize messages to reach a wide audience**: create a message template, upload a file containing customization parameters and we will handle the customization for you
- **Send emails**: Just click send and Postman will send those messages out to your intended audience via email
- **Send SMSes**: Enter your twilio credentials, and Postman will send those messages via SMS. No integration with twilio is necessary
- **View stats**: Keep track of your campaign's progress as it's sending, and check back when it's done.

## API Usage

Just want to use the API? See [api-usage.md](docs/api-usage.md) for details.

## Development

### Install and run required services

Set up a **postgresql@11** database, **redis** cache and **localstack** server. Postgresql and redis can be started either natively or using Docker. We recommend using Docker.

#### Starting all services using Docker:

```bash
export AWS_ENDPOINT=http://localhost:4566
export FILE_STORAGE_BUCKET_NAME=localstack-upload
export AWS_LOG_GROUP_NAME=postmangovsg-beanstalk-localstack

npm run dev:services
```

#### Starting postgresql and redis natively:

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

# Start localstack container
export AWS_ENDPOINT=http://localhost:4566
export FILE_STORAGE_BUCKET_NAME=localstack-upload
export AWS_LOG_GROUP_NAME=postmangovsg-beanstalk-localstack

npm run dev:localstack
```

Optionally, run the following to install and use `cw` to tail Cloudwatch logs:

```bash
brew tap lucagrulla/tap
brew install cw

# Tail logs on localstack
cw tail -r ap-northeast-1 -u $AWS_ENDPOINT -f $AWS_LOG_GROUP_NAME:`node --eval='console.log(require("os").hostname())'`
```

### Secrets detection

This project makes of [detect-secrets](https://github.com/Yelp/detect-secrets) to prevent secrets and credentials from being committed to the repository.
It runs as a pre-commit hook and it needs to be installed if you intend to make commits to the repo.
**Note**: The reason we're running `detect-secrets` through `detect-secrets:precommit` instead of using `lint-staged` is because `detect-secrets-hook` doesn't work well with the combination of output of staged files by `lint-staged` and baseline supplied.

Run the following to install:

```bash
pip install detect-secrets==1.2.0
```

Upon blockage by `detect-secrets-hook`, please take these steps:

- Go into each of the locations pointed out by `detect-secrets-hook` and remove accidentally added secrets
- If some of these detections are false positive (please be super sure about this, when not sure check with teammates), update the secrets baseline by running `npm run detect-secrets:update

### Set environment variables

Example environment variables can be found in

- [backend/.env-example](backend/.env-example)
- [frontend/.env-example](frontend/.env-example)
- [worker/.env-example](worker/.env-example)

Set the environment variables in a file named `.env` in each folder. If you're a developer at OGP, ask your friendly colleague for their env variables. (Please help to ensure the `.env-example` file stays up-to-date though!)

### Install dependencies

```bash
cd postmangovsg
npm install
```

### Database migration

#### Local database

This step needs to be run if you have made a change to the database schema, or if you are setting up the project for the first time.

```bash
cd postmangovsg/backend
npm run database:migrate && npm run database:seed
```

### Compile frontend translations

[lingui](https://lingui.js.org/) is used for internationalization. Read [this](frontend/src/locales/README.md) for more info.

```bash
cd postmangovsg/frontend
npm run extract
npm run compile
```

### Run the app

```bash
cd postmangovsg
npm run dev
```

You should find the

- React frontend at [localhost:3000](http://localhost:3000)
- Express backend at [localhost:4000](http://localhost:4000)
- Swagger docs at [localhost:4000/docs](http://localhost:4000/docs)

## Deployment

We use Github Actions to simplify our deployment process:

- `backend` is deployed on [Elastic Beanstalk](.github/workflows/deploy-eb.yml)
- `frontend` is deployed on [AWS Amplify](.github/workflows/deploy-frontend.yml)
- `worker` is deployed on [Elastic Container Service](.github/workflows/deploy-worker.yml)
- `serverless` is deployed on AWS Lambda

## Releasing

1. Checkout a new release branch from `develop`.
2. Bump the version of each of the subpackages (frontend, backend, worker).
3. Stage changes for subpackage `package.json` and `package-lock.json`.
4. Bump the version of the main package.
   - You will need to use `--force` as the working directory is not clean.
5. Push both the version commit and tag to GitHub.
6. Open a new pull request and consolidate changelist from the commits made since the previous release.
7. Merge pull request into master to trigger Travis build and deploy. Note that we do not squash commits when merging into master.
   - Manually trigger a custom build on Travis if there were changes made to the worker.
8. Create a new pull request to merge release branch back into `develop` branch.

**Example:**

```bash
# Create a new release branch for a new minor version (e.g. v1.6.0 -> v1.7.0)
$ git checkout develop
$ git checkout -b release-v1.7.0

# Bump shared module version
$ cd ../ && cd shared/
$ npm version minor

# Bump frontend version
$ cd frontend/
$ npm version minor

# Bump backend version
$ cd ../ && cd backend/
$ npm version minor

# Bump worker version
$ cd ../ && cd worker/
$ npm version minor

# Stage changes for subpackage package.json and package-lock.json
$ cd ../
$ git add */package.json */package-lock.json

# Create a version commit for main package
$ npm version minor --force

# Push version commit and tag to GitHub
$ git push -u origin release-v1.7.0
$ git push origin v1.7.0
```

## Serverless

We make use of AWS lambda to handle the callbacks from Twilio, as well as updating email delivery status.

See [serverless-docs](serverless/README.md) for details

## Downtime procedure

See [downtime-procedure](docs/downtime-procedure/index.md) for steps on how to bring the app down in the event that we need to make database changes

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

| Cluster Name: postmangovsg-workers |
| ---------------------------------- |

| Service Name    | LaunchType | Platform version |
| --------------- | ---------- | ---------------- |
| staging-sending | FARGATE    | 1.4.0            |
| staging-logger  | FARGATE    | 1.4.0            |
| prod-sending    | FARGATE    | 1.4.0            |
| prod-logger     | FARGATE    | 1.4.0            |

## Architecture

See [architecture](docs/architecture/index.md) for details

## Local node module

See [local-module.md](docs/local-module.md) for details

## How messages are sent

See [sending.md](docs/sending.md) for details

## Forking and configuring this product

**Disclaimer of Liability.** This product is pending Vulnerability Assessment and Penetration Testing (VAPT). You should conduct your own security assessment prior to using code provided in this repository. Open Government Products (OGP) makes no representations or warranties of any kind, expressed or implied about the completeness, accuracy, reliability, suitability or availability of this codebase. Any usage is at your own risk.

### Backend

See [configure/backend](docs/configure/backend.md) for details

### Frontend

See [configure/frontend](docs/configure/frontend.md) for details

### Worker

See [configure/worker](docs/configure/worker.md) for details

## Contributions

The production branch is `master`, and the development branch is `develop`.

**If you have write access to this repository**

- Check out your feature branch from `develop`
- Make changes, and commit those changes
- Push these changes to Github
- Submit a pull request against `develop`, filling in the standard template

**If you do not have write access to this repository**

- Fork this repository
- Clone the forked repository to your machine
- Create a branch, make changes and commit those changes.
- Push these changes to Github
- Submit a pull request against `basefork/develop` (that's us!)
- Describe the issue as thoroughly as possible, and with screenshots if applicable. A picture speaks a thousand words!

For more information, see [CONTRIBUTING.md](docs/CONTRIBUTING.md)
