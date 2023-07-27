# SST for Postmangovsg

## Overview

This folder contains serverless constructs for Postman developed using SST.

## AWS Credentials

Ensure that your AWS CLI profile is set up. [See here](https://docs.sst.dev/packages/sst#aws-profile) for more info.

## Stages

In SST, resources are deployed specifically to stages. [See here](https://docs.sst.dev/advanced/environment-specific-resources) for more info. You can specify the stage for SST CLI commands using the `--stage` flag; in its absence, the default stage in `.sst/stage` will be used.

Each developer will be prompted to use a stage corresponding to their username in AWS. The two stages relevant for deployment are:

- `stg`: for deploying to staging
- `prod`: for deploying to production

## Local development

The application accesses environment variables stored in the Parameter Store. To set these secrets, you can use the SST CLI.

To set a secret, run:

```zsh
npx sst secrets set <key> <value> --stage <stage>
```

To avoid leaving secrets in your terminal history, you could add a git-ignored `secret.txt` in the root of this folder, paste the secret in the file, and run:

```zsh
npx sst secrets set <key> $(cat secret.txt) --stage <stage>
```

To load a set of environment variables from a local `.env` file, run:

```zsh
npx sst secrets load .env
```

## Deploying to staging and production

We have GitHub Actions that will deploy automatically when the PR is pushed to the `staging` and `master` respectively. Be sure to set any newly created secrets via the CLI before deploying in this way.

You can also deploy manually via the CLI for staging, but you should not do this for production.
