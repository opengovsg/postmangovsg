# Backup Verification Service
A Google Cloud Run service is deployed in GCP to verify the integrity of the backups being transferred from AWS every night. In addition, the `verify-backup.sh` script can also be used independently to decrypt and restore backups to any PosgreSQL database instance.

## Setup GCP services for verifying backups
The following steps describe the setup process for services required for the verifying backups workflow on Google Cloud Platform.

### Service account
There are dedicated service accounts for staging and production associated to the services required for the verify backup workflow. It contains all the required permissions to execute this workflow. All required permissions are encapsulated in two roles: custom role `verify-backup` and `Cloud Run Invoker` role. Learn more details about [permissions](#permissions-required).

### Authentication
The service account key for the separate offline backup gcloud account is stored in GCP Secret Manager and 1Password. This is required for the verification script to pull the encrypted db dumps from the offline gcp account.

### Pre-requisites to run scripts
1. Download the service account key associated with the accounts mentioned in [Service account](#service-account).
2. Download and install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
3. Get the environment variable values from 1Password `GCP Verify Backup env vars` - Staging/Production and save to `.env` file
4. Set the following environment variables in the shell
   - `GOOGLE_APPLICATION_CREDENTIALS` - Path to the service account key in step 1
   - `GCLOUD_SERVICE_ACCOUNT` - Service account email address
   - `GCLOUD_RUN_SERVICE_NAME` - Cloud Run service name
   - `GCLOUD_RUN_SERVICE_URL` - Cloud Run service url
5. Ensure that you have the correct variables associated to the environment (staging/production) you want to deploy to

### Deploying to GCP
1. Run `serverless/verify-backup/scripts/deploy.sh` to activate service account on gcloud cli, submit docker build to cloud build and deploy to cloud run
2. Leave service running on cloud run - the container only starts up when there is an incoming request, and is scaled down to 0 when idle
3. This is to executed manually whenever there are code changes

The pre-built images submitted by Cloud Build are stored in the container registry. The images in the container registry live in a dedicated cloud storage bucket.

### Triggering verification of backup

1. Create Cloud Scheduler job if it does not exist, using `serverless/verify-backup/scripts/create-cloud-scheduler-job.sh`
2. This job pings the cloud run service at the configured time, after AWS RDS backups are completed
2. When cloud run receives an incoming request, it wakes up the container and runs the docker entrypoint script (ref [https://cloud.google.com/run/docs/tips/general#starting_services_quickly](https://cloud.google.com/run/docs/tips/general#starting_services_quickly))
3. The docker entrypoint script runs the decrypt and restore to Postgres script, and starts a server to ensure the container does not exit

### Notification upon success/failure of restore

1. Sentry cli has been integrated with the verification scripts
2. In `serverless/verify-backup/scripts/verify-backup.sh`, a sentry event is created when the restore is successful or fails

### Permissions required

Service accounts require the user-defined custom role `verify-backup` and google cloud predefined `Cloud Run Invoker` role.

Permissions included in `verify-backup` role are in 1Password.

## Running the restoration script outside of GCP
The `verify-backup.sh` script can also be used outside of GCP to download and restore a database backup to any PostgreSQL database instance.

### Pre-requisites
Before running the script, ensure the following pre-requisites are met:
1. Download and install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Ensure that the authenticated account has sufficient permissions. You may make use of the credentials in [Service account](#service-account). Set
`GOOGLE_APPLICATION_CREDENTIALS` to point to the path where the credentials are stored.
3. Download and save the appropriate set of environment variables from 1Password (GCP Verify Backup env vars - staging/production) into a `.env` file
4. Ensure network connectivity to the target database

### Set PostgreSQL connection environment variables
Next, set the required PostgreSQL environment variables to establish a connection target database instance. Examples of common environment variables:
| Variable | Description |
| :------- | :---------- |
| `PGUSER` | Database user used to establish connection |
| `PGPASSWORD` | Password for database user |
| `PGPORT` | Port which the database is listening on |
| `PGHOST` | Host where the database is running at |
| `PGDATABASE` | Name of the database. Note that this is [not used](https://www.postgresql.org/docs/11/app-pgrestore.html) by `pg_restore` |

For a full list of available environment variables, refer to this [page](https://www.postgresql.org/docs/11/libpq-envars.html).

### Run restoration script
To run the script, run the following steps in the `serverless/verify-backup` folder:
```bash
# Install and build the node component of the restoration script
$ npm install && npm run build

# Set the environment variables listed in the previous section
$ export PGUSER=testuser
$ export PGHOST=localhost

# Set to false if you do not want to send Sentry event to Slack
$ export SEND_NOTIFICATION=false

# Execute the restoration script
$ ./scripts/verify-backup.sh
Successfully restored 2020-11-30_12-34-56 db dump! The restored db has 10 users, 1000 campaigns and 1000000 sent messages.
```