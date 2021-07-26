#!/bin/bash
# Exit on failure of any command
set -e
# Keep track of the last executed command
trap 'LAST_COMMAND=$CURRENT_COMMAND; CURRENT_COMMAND=$BASH_COMMAND' DEBUG
# Echo an error message before exiting
trap 'echo "\"${LAST_COMMAND}\" command failed with exit code $?."' ERR

CLUSTER=$1
SENDING_SERVICE=$2
LOGGING_SERVICE=$3
TAG=$REPO:travis-$TRAVIS_BRANCH-$TRAVIS_COMMIT-$TRAVIS_BUILD_NUMBER
echo "CLUSTER=$CLUSTER SENDING_SERVICE=$SENDING_SERVICE LOGGING_SERVICE=$LOGGING_SERVICE TAG=$TAG REGION=$AWS_DEFAULT_REGION"

export PATH=$PATH:$HOME/.local/bin
./bad.sh
# Install tools for deployment
pip install --user awscli # For docker 
curl https://raw.githubusercontent.com/silinternational/ecs-deploy/master/ecs-deploy -o ecs-deploy
sudo chmod +x ecs-deploy

# Login to docker and push image to ECR
eval $(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)
docker build -t $TAG .
docker push $TAG

# Update ECS
./ecs-deploy -c $CLUSTER -n $SENDING_SERVICE -i $TAG -r $AWS_DEFAULT_REGION --use-latest-task-def -t 600 &
./ecs-deploy -c $CLUSTER -n $LOGGING_SERVICE -i $TAG -r $AWS_DEFAULT_REGION --use-latest-task-def -t 600 &
wait
