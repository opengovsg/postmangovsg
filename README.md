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


## Contributions

## Architecture

## How it sends messages


