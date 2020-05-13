/**
 * A lambda authorizer is required to validate that requests from Twilio
 * contain Authorization header. In the absence of Authorization header,
 * this function returns 'Unauthorized'. API Gateway then proceeds to return
 * a 401 Unauthorized status with header 'WWW-Authenticate: Basic realm="validate twilio request"'
 * This header response is configured in API Gateway > API: postman > Gateway responses > Unauthorized
 */

exports.handler = async (event) => {
    // Adapted from https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html#api-gateway-lambda-authorizer-create
    // This request-based authorizer is customised for Twilio callback requests.
    // A request is authorized if the client-supplied Authorization header,
    // else returns "Unauthorized"


    // Retrieve headers from the Lambda function input:
    const headers = event.headers;

    // Parse the input for the parameter values
    const tmp = event.methodArn.split(':');
    const apiGatewayArnTmp = tmp[5].split('/');
    if (apiGatewayArnTmp[3]) {
        resource += apiGatewayArnTmp[3];
    }

    // Perform authorization to return the Allow policy for correct parameters and 
    // the 'Unauthorized' error, otherwise.
    const condition = {};
    condition.IpAddress = {};

    if (headers.Authorization) {
        return generateAllow('me', event.methodArn)
    }  else {
        return "Unauthorized"
    }
};

// Help function to generate an IAM policy
const generatePolicy = function(principalId, effect, resource) {
    // Required output:
    const authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        const statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }

    return authResponse;
}

const generateAllow = function(principalId, resource) {
    return generatePolicy(principalId, 'Allow', resource);
}