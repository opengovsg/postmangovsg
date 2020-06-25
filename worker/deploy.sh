#!/bin/bash
CLUSTER=$1
SENDING_SERVICE=$2
LOGGING_SERVICE=$3
TAG=$REPO:travis-$TRAVIS_BRANCH-$TRAVIS_COMMIT-$TRAVIS_BUILD_NUMBER
echo "CLUSTER=$CLUSTER SENDING_SERVICE=$SENDING_SERVICE LOGGING_SERVICE=$LOGGING_SERVICE TAG=$TAG REGION=$AWS_DEFAULT_REGION"

export PATH=$PATH:$HOME/.local/bin
# Install tools for deployment
pip install --user awscli # For docker 
curl https://raw.githubusercontent.com/silinternational/ecs-deploy/master/ecs-deploy -o ecs-deploy
sudo chmod +x ecs-deploy

# Login to docker and push image to ECR
eval $(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)
docker build -f ./worker/Dockerfile -t $TAG .
docker push $TAG

# Update ECS
./ecs-deploy -c $CLUSTER -n $SENDING_SERVICE -i $TAG -r $AWS_DEFAULT_REGION --use-latest-task-def
./ecs-deploy -c $CLUSTER -n $LOGGING_SERVICE -i $TAG -r $AWS_DEFAULT_REGION --use-latest-task-def
