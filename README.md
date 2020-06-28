<a href="https://postman.gov.sg"><img src="frontend/src/assets/img/brand/app-logo.svg" title="Postman" alt="Postman.gov.sg"></a>

# Postman.gov.sg

> Postman.gov.sg enables public officers to send templated messages to many recipients.

## Table of Contents

- [Features](#features)
- [Development](#development)
  - [Install and run required services](#install-and-run-required-services)
  - [Set environment variables](#set-environment-variables)
  - [Install and run the app](#install-and-run-the-app)
- [Deployment](#deployment)
- [Releasing](#releasing)
- [Serverless](#serverless)
- [Downtime procedure](#downtime-procedure)
- [Infrastructure customizations](#infrastructure-customizations)
  - [Amplify rewrite rule](#amplify-rewrite-rule)
  - [Elastic Container Service](#elastic-container-service)
- [Architecture](#architecture)
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

- [backend/.env-example](backend/.env-example)
- [frontend/.env-example](frontend/.env-example)
- [worker/.env-example](worker/.env-example)

Set the environment variables in a file named `.env` in each folder

### Install and run the app

```bash
cd postmangovsg
npm install
npm run dev
```

You should find the

- React frontend at [localhost:3000](http://localhost:3000)
- Express backend at [localhost:4000](http://localhost:4000)
- Swagger docs at [localhost:4000/docs](http://localhost:4000/docs)

## Deployment

We use TravisCI to simplify our deployment process:

- `backend` is deployed on Elastic Beanstalk
- `frontend` is deployed on AWS Amplify
- `worker` is deployed on Elastic Container Service
- `serverless` is deployed on AWS Lambda

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
