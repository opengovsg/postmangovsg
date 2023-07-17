# SST for Postmangovsg

## Overview

This folder contains serverless constructs for Postman developed using SST. In the long-term, all the features currently in the `serverless` folder will be migrated to be developed and deployed using SST.

## AWS Credentials

Ensure that your AWS CLI profile is set up. [See here](https://docs.sst.dev/packages/sst#aws-profile) for more info.

## Stages

In SST, resources are deployed specifically to stages. [See here](https://docs.sst.dev/advanced/environment-specific-resources) for more info. You can specify the stage for SST CLI commands using the `--stage` flag; in its absence, the default stage in `.sst/stage` will be used.

Each developer will be prompted to use a stage corresponding to their username in AWS. The two stages relevant for deployment are:

- `stg`: for deploying to staging
- `prod`: for deploying to production

## Local development

To maintain consistency with the deployment environment, we try to minimise the use of `.env` variables. Instead, use `Config` to set secrets and parameters (see the codebase for examples).

To set a secret, run:

```zsh
npx sst config set <key> <value> --stage <stage>
```

To avoid leaving secrets in your terminal history, you could add a git-ignored `secret.txt` in the root of this folder, paste the secret in the file, and run:

```zsh
npx sst config set <key> $(cat secret.txt) --stage <stage>
```

We use `LOCAL_DB_URI` in the `.env` file to develop against a local database. You could also develop against the staging database by using the staging DB's URI and turning on OGP VPN and running a tunnel via the jumphost. Go to `backend` folder and run `npm run tunneldb:staging`.

## Deploying to staging and production

We have GitHub Actions that will deploy automatically when the PR is pushed to the `staging` and `master` respectively. Be sure to set any newly created secrets via the CLI before deploying in this way.

You can also deploy manually via the CLI for staging, but you should not do this for production.
