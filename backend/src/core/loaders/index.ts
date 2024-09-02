import { Application } from 'express'
import securityHeadersLoader from './security-headers.loader'
import expressLoader from './express.loader'
import sessionLoader from './session.loader'
import sequelizeLoader from './sequelize.loader'
import cloudwatchLoader from './cloudwatch.loader'
import uploadQueueLoader from './upload-queue.loader'
import {
  InitAuthService,
  InitCredentialService,
  RedisService,
} from '@core/services'

const loaders = async ({ app }: { app: Application }): Promise<void> => {
  const redisService = new RedisService()
  ;(app as any).redisService = redisService
  ;(app as any).authService = InitAuthService(redisService)
  ;(app as any).credentialService = InitCredentialService(redisService)
  securityHeadersLoader({ app })
  await cloudwatchLoader()
  await sequelizeLoader()
  await sessionLoader({ app })
  await expressLoader({ app })
  await uploadQueueLoader()
  ;(app as any).cleanup = async function (): Promise<void> {
    await (app as any).redisService.shutdown()
  }
}

export { loaders }
