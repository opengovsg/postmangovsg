echo "Deploy branch $2"
JOB_ID=$(aws amplify start-job --app-id $1 --branch-name $2 --job-type RELEASE | jq -r '.jobSummary.jobId')
echo "Release started"
echo "Job ID is $JOB_ID"
if [ -z "$JOB_ID" ]
then exit 1
fi

while [[ "$(aws amplify get-job --app-id $1 --branch-name $2 --job-id $JOB_ID | jq -r '.job.summary.status')" =~ ^(PENDING|RUNNING)$ ]]; do sleep 1; done
JOB_STATUS="$(aws amplify get-job --app-id $1 --branch-name $2 --job-id $JOB_ID | jq -r '.job.summary.status')"
echo "Job finished"
echo "Job status is $JOB_STATUS"
if [ "$JOB_STATUS" != "SUCCEED" ]
then exit 1
fi