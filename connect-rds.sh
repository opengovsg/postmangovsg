#!/bin/bash

# This helper script does the following:
# 1. Generate temporary AWS session credentials with MFA
# 2. Send local SSH key to jumphost in order to create an SSH tunnel with EC2 instance connect
# 3. Generate RDS auth token
# 4. Create SSH tunnel to RDS instance through jumphost using SSH keys sent in step 2

ARGS=$@
CONFIG_FILE=""
MFA_ARN=""
MFA_TOKEN=""
SSH_PUBLIC_KEY=""

show_help() {
  echo "usage: connect-rds.sh [CONFIG_FILE_PATH] [MFA_ARN] [SSH_PUBLIC_KEY]"
  echo
  echo "Arguments:"
  echo "  CONFIG_FILE_PATH - path to config file with connection variables"
  echo "  MFA_ARN          - ARN for MFA device. Can be retrieved from AWS Console > My Security Credentials."
  echo "  SSH_PUBLIC_KEY   - SSH public key to use for EC2 instance connect. Can be generated with ssh-keygen."
  echo
}

parse_args() {
  if [ "$#" -ne 3 ]; then
    show_help
    echo "Invalid number of arguments."
    exit 1
  fi

  CONFIG_FILE=$1
  MFA_ARN=$2
  SSH_PUBLIC_KEY=$3

  if [ ! -f "$CONFIG_FILE" ]; then
    show_help
    echo "Config file ($CONFIG_FILE) does not exists"
    exit 1
  fi

  if [ ! -f "$SSH_PUBLIC_KEY" ]; then
    show_help
    echo "SSH public key ($SSH_PUBLIC_KEY) does not exists"
    exit 1
  fi
}

check_aws_configured() {
  # This file should exist after running aws configure
  if [ ! -f "$HOME/.aws/credentials" ]; then
    echo "You have not configured your AWS CLI. Run 'aws configure' and try again."
    exit 1
  fi
}

prompt_mfa_token() {
  while [ "$MFA_TOKEN" == "" ]; do
    read -p 'Enter your MFA token: ' MFA_TOKEN
  done
}

safe_eval_config_line() {
  # Basic validation to check that line matches the format KEY=VALUE before evaluating it.
  MATCH=$(echo $1 | grep -E "^[^ ]*=[^ ]+$")
  if [ -z $MATCH ]; then
    echo "Invalid line in configuration file: $1"
    exit 1
  else
    eval $MATCH
  fi
}

load_config_file() {
  while IFS= read -r line; do
    safe_eval_config_line $line
  done < $CONFIG_FILE
  safe_eval_config_line $line
}

generate_aws_session_credentials() {
  CREDENTIALS=$(aws sts get-session-token --serial-number $MFA_ARN --token-code $MFA_TOKEN --output text)
  if [ $? -ne 0 ]; then
    echo "Failed to get AWS session token"
    exit 1
  fi

  # Set the AWS creds for this current shell
  export AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | cut -f2 -d ' ')
  export AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | cut -f4 -d ' ')
  export AWS_SESSION_TOKEN=$(echo $CREDENTIALS | cut -f5 -d ' ')
}

send_ssh_key() {
  OUTPUT=$(aws ec2-instance-connect send-ssh-public-key \
    --output text \
    --instance-id $JUMPHOST_INSTANCE_ID \
    --availability-zone $JUMPHOST_REGION \
    --instance-os-user $JUMPHOST_USER \
    --ssh-public-key "file://$SSH_PUBLIC_KEY")

  if [ $? -ne 0 ]; then
    echo "Failed to send SSH key to EC2 instance"
    exit 1
  fi
}

start_rds_ssh_tunnel() {
  RDS_PASSWORD=$(aws rds generate-db-auth-token \
    --hostname $RDS_HOST \
    --port $RDS_PORT \
    --region $RDS_REGION \
    --username $RDS_USER)

  echo
  echo "Created SSH tunnel to RDS instance. Connect using the following credentials:"
  echo "  * host: localhost"
  echo "  * port: 15432"
  echo "  * username: $RDS_USER"
  echo "  * password: $RDS_PASSWORD"
  echo
  echo "Press (Ctrl-C) to close the tunnel"

  ssh -N -L 15432:$RDS_HOST:$RDS_PORT $JUMPHOST_USER@$JUMPHOST_HOST
}

# Main
parse_args $ARGS
check_aws_configured
prompt_mfa_token

load_config_file
echo "Loaded config file located at $CONFIG_FILE"

generate_aws_session_credentials
echo "Generated AWS session credentials"

send_ssh_key
echo "Sent SSH key ($SSH_PUBLIC_KEY) to jumphost using EC2 instance connect"

start_rds_ssh_tunnel
