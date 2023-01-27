<a href="https://postman.gov.sg"><img src="frontend/src/assets/img/brand/app-logo.svg" title="Postman" alt="Postman.gov.sg"></a>

# Postman.gov.sg

> Postman.gov.sg enables public officers to send templated messages to many recipients.

## Table of Contents

- [Postman.gov.sg](#postmangovsg)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [API Usage](#api-usage)
  - [Development](#development)
    - [Install and run required services](#install-and-run-required-services)
      - [Starting all services using Docker](#starting-all-services-using-docker)
      - [Starting postgresql and redis natively](#starting-postgresql-and-redis-natively)
      - [Optionally, run the following to install and use `cw` to tail Cloudwatch logs](#optionally-run-the-following-to-install-and-use-cw-to-tail-cloudwatch-logs)
    - [Secrets detection](#secrets-detection)
    - [Set environment variables](#set-environment-variables)
    - [Install dependencies](#install-dependencies)
    - [Database migration](#database-migration)
      - [Local database](#local-database)
    - [Compile frontend translations](#compile-frontend-translations)
    - [Run the app](#run-the-app)
  - [Deployment](#deployment)
  - [Releasing](#releasing)
  - [Serverless](#serverless)
  - [Downtime procedure](#downtime-procedure)
  - [Infrastructure customizations](#infrastructure-customizations)
    - [Amplify rewrite rule](#amplify-rewrite-rule)
    - [Elastic Container Service](#elastic-container-service)
  - [Local node module](#local-node-module)
  - [How messages are sent](#how-messages-are-sent)
  - [Forking and configuring this product](#forking-and-configuring-this-product)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Worker](#worker)
    - [Product Dashboards on Grafana](#product-dashboards-on-grafana)
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

Set up a **postgresql@11** database, **redis** cache and **localstack** server. PostgreSQL and Redis can be started either natively or using Docker. We recommend using Docker.

#### Starting all services using Docker

```zsh
export AWS_ENDPOINT=http://localhost:4566
export FILE_STORAGE_BUCKET_NAME=localstack-upload
export AWS_LOG_GROUP_NAME=postmangovsg-beanstalk-localstack

npm run dev:services
```

#### Starting postgresql and redis natively

```zsh
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

#### Optionally, run the following to install and use `cw` to tail Cloudwatch logs

```zsh
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

```zsh
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
- [.env-example](.env-example)

Set the environment variables in a file named `.env` in each folder. If you're a developer at OGP, ask your friendly colleague for their env variables. (Please help to ensure the `.env-example` file stays up-to-date though!)

### Install dependencies

```zsh
npm install
```

### Database migration

#### Local database

This step needs to be run if you have made a change to the database schema, or if you are setting up the project for the first time.

```zsh
cd backend
npm run db:migrate # run all pending migrations
npm run db:seed # seed database with dummy data
```

If you run into errors at the `db:migrate` step, this is likely because you have created a new model in TypeScript that has not been compiled to JavaScript. Run `npm run build` to fix this error.

If you need to undo any database migrations:

```zsh
cd backend
npm run db:undo # undo most recent migration
```

You can find more info on undoing migrations using Sequelize [here](https://sequelize.org/docs/v6/other-topics/migrations/#undoing-migrations).

If you wish to create a new migration, run:

```zsh
cd backend
npx sequelize-cli migration:create --name migration-name-in-kebab-case
```

### Compile frontend translations

[lingui](https://lingui.js.org/) is used for internationalization. Read [this](frontend/src/locales/README.md) for more info.

```zsh
cd frontend
npm run extract
npm run compile
```

### Run the app

```zsh
npm run dev
```

You should find the

- React frontend at [localhost:3000](http://localhost:3000)
- Express backend at [localhost:4000](http://localhost:4000)
- Swagger docs at [localhost:4000/docs](http://localhost:4000/docs)

Alternatively, if you would like to develop locally against staging database and workers, ensure that you have set up the necessary variables in `./backend/.env` and run either:

- `npm run dev:connectstagingdb` (to make a read + write connection with the staging db); or
- `npm run dev:connectstagingdbreadonly` (to make a readonly connection with the staging db.).

Your frontend and backend will still be on `localhost` but you will be able to use staging database and workers.

## Deployment

We use Github Actions to simplify our deployment process:

- `backend` is deployed on [Elastic Beanstalk](.github/workflows/deploy-eb.yml)
- `frontend` is deployed on [AWS Amplify](.github/workflows/deploy-frontend.yml)
- `worker` is deployed on [Elastic Container Service](.github/workflows/deploy-worker.yml)
- `serverless` is deployed on AWS Lambda

## Releasing

When a pull request is merged to `master`, it will be deployed automatically.

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

### Product Dashboards on Grafana

We currently have created two Grafana product metrics dashboards hosted on an EC2 instance. You can access them by connecting to the OGP VPN and following the URLs below. In order to SSH into the EC2 instance:

1. Update the following env variables on `/backend/.env`:`GRAFANA_KEY_FOLDER` (get the `.pem` file from 1Password and store it in your `~/.ssh/` folder) and `GRAFANA_EC2_HOST_URL` (this should be `ec2-user@<EC2_instance_Public_IPv4_DNS>`, which you can find from 1Password too).
2. Connect to the OGP VPN first, then run `npm run grafana`.

The URLs of the Grafana dashboards are:

- [PostmanSG Executive Dashboard](http://13.213.17.36:3000/d/ghhtH9W4z/postmansg-executive-dashboard?orgId=1&from=1588291200000&to=1661990400000)
- [PostmanSG Internal Dashboard](http://13.213.17.36:3000/d/a0GW6CmVk/postmansg-product-metrics-dashboard-internal?orgId=1)

## Contributions

The production branch is `master` and each PR is deployed when it is merged into `master`.

**If you have write access to this repository**

- Check out your feature branch from `master`
- Make changes, and commit those changes
- Push these changes to Github
- Submit a pull request against `master`, filling in the standard template

**If you do not have write access to this repository**

- Fork this repository
- Clone the forked repository to your machine
- Create a branch, make changes and commit those changes.
- Push these changes to Github
- Submit a pull request against `basefork/develop` (that's us!)
- Describe the issue as thoroughly as possible, and with screenshots if applicable. A picture speaks a thousand words!

For more information, see [CONTRIBUTING.md](docs/CONTRIBUTING.md)
