import tracer from 'dd-trace'
import { ClientRequest, IncomingMessage } from 'http'
import { Span } from 'opentracing'

tracer.init({
  service: 'postman',
  env: 'local',
})
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
