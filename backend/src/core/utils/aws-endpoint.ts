import convict from 'convict'

interface AWSEndpointConfig {
  aws: { awsEndpoint: any; awsRegion: any }
}

/**
 * Provide an Object containing the endpoint to send AWS requests to.
 * This Object is to be injected into AWS JavaScript clients.
 */
const configureEndpoint = <T extends AWSEndpointConfig>(
  config: convict.Config<T>
) => {
  return {
    region: config.get('aws.awsRegion'),
    endpoint: config.get('aws.awsEndpoint'),
    s3ForcePathStyle: true,
  }
}

export { configureEndpoint }
