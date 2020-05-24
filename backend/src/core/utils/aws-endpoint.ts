import convict from 'convict'

interface AWSEndpointConfig {
  aws: { awsEndpoint: any; awsRegion: any }
}

/**
 * Provide an Object containing either the endpoint to send AWS requests to,
 * or if that is absent, the region from which to generate the endpoint.
 * This Object is to be injected into AWS JavaScript clients.
 *
 * @param config - a convict object whose schema includes AWSEndpointConfig
 * @return an object containing either the endpoint or region field
 */
const configureEndpoint = <T extends AWSEndpointConfig>(
  config: convict.Config<T>
): any => {
  const endpoint = config.get('aws.awsEndpoint')
  const region = config.get('aws.awsRegion')
  return endpoint ? { endpoint } : { region }
}

export { configureEndpoint }
