import tracer from 'dd-trace'
import { ClientRequest, IncomingMessage } from 'http'
import { Span } from 'opentracing'

// Make it an init function so the code won't be evaluated and flagged as invalid
// on frontend linting-in-background during development
export function init() {
  tracer.init()
  tracer.use('http', {
    client: {
      hooks: {
        request: (
          span: Span | undefined,
          req: ClientRequest | undefined,
          _: IncomingMessage | undefined
        ) => {
          span?.setTag('resource.name', `${req?.method} ${req?.path}`)
        },
      },
    },
  })
}

export const getHttpLogTransportOpts = () => {
  const httpTransportOptions = {
    host: 'http-intake.logs.datadoghq.com',
    path: `/api/v2/logs?dd-api-key=${process.env.DD_API_KEY}&ddsource=nodejs&service=${process.env.DD_SERVICE}`,
    ssl: true,
  }
  return httpTransportOptions
}
