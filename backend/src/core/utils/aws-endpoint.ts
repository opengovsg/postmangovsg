import convict from 'convict'

interface AWSEndpointConfig {
  aws: { awsEndpoint: any; awsRegion: any }
}

// todo: refactor to sth simpler if we don't use localstack
/**
 * Provide an Object containing either the endpoint to send AWS requests to,
 * or if that is absent, the region from which to generate the endpoint.
 * This Object is to be injected into AWS JavaScript clients, and is meant
 * to allow switching between AWS and localstack. The latter only supports
 * path-style S3 requests, and will need clients to generate S3 path-style URLs
 *
 * @param config - a convict object whose schema includes AWSEndpointConfig
 * @return an object containing either:
 *   - region and endpoint and s3ForcePathStyle true if aws.awsEndpoint
 *     present in convict, or;
 *   - the region field alone otherwise
 */
const configureEndpoint = <T extends AWSEndpointConfig>(
  config: convict.Config<T>
): any => {
  const endpoint = config.get('aws.awsEndpoint')
  const region = config.get('aws.awsRegion')
  return endpoint ? { region, endpoint, s3ForcePathStyle: true } : { region }
}

export { configureEndpoint }
