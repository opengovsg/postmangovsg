CURRDIR=$PWD
DIRECTORY=$PWD/../..
echo "Building files in $DIRECTORY"

cd $DIRECTORY/serverless/postman-api-gateway-authorizer
echo "##### Authorizer: $PWD"
zip -qr $CURRDIR/authorizer.zip *

cd $DIRECTORY/serverless/log-twilio-callback
echo "##### Twilio callback: $PWD"
npm install && npm run build
npm prune --production
zip -qr $CURRDIR/twilio-callback.zip build package.json node_modules/

cd $DIRECTORY/serverless/log-email-sns
echo "##### Email callback: $PWD"
npm install && npm run build
npm prune --production
zip -qr $CURRDIR/email-callback.zip build package.json node_modules/
