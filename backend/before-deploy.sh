TAG=$REPO:travis-$TRAVIS_BRANCH-$TRAVIS_COMMIT-$TRAVIS_BUILD_NUMBER
ECR_REPO=$REPO-backend

export PATH=$PATH:$HOME/.local/bin
# Install tools for deployment
pip install --user awscli #For docker

# Login to AWS ECR, credentials defined in $AWS_ACCESS_KEY_ID and $AWS_SECRET_ACCESS_KEY
$(aws ecr get-login --no-include-email --region ap-southeast-1)
docker build -f Dockerfile -t $ECR_REPO:$TAG .
docker tag $ECR_REPO:$TAG $ECR_REPO:$TRAVIS_BRANCH
docker push $ECR_REPO

# Edit Dockerrun from Travis environment variables
sed -i -e "s|@REPO|$ECR_REPO|g" Dockerrun.aws.json
sed -i -e "s|@TAG|$TAG|g" Dockerrun.aws.json
zip -r "$TAG.zip" Dockerrun.aws.json

- export ELASTIC_BEANSTALK_LABEL="$TAG-$(env TZ=Asia/Singapore date "+%Y%m%d%H%M%S")"