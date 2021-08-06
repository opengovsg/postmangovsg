#!/bin/bash
TAG=$BACKUP_REPO:travis-$TRAVIS_BRANCH-$TRAVIS_COMMIT-$TRAVIS_BUILD_NUMBER

export PATH=$PATH:$HOME/.local/bin
# Install tools for deployment
pip install --user awscli # For docker

# TODO: Move to awscli v2
eval $(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)
docker build -t $TAG .
docker push $TAG
