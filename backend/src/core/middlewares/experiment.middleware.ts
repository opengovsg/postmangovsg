import {
  ApiAuthenticationError,
  ApiAuthorizationError,
} from '@core/errors/rest-api.errors'
import { experimentService } from '@core/services'
import { NextFunction, Request, Response } from 'express'

export const experimentalUserOnly =
  (feature: string) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.session?.user?.id) {
      throw new ApiAuthenticationError('Request not authenticated')
    }
    const u = await experimentService.getExperimentalUser(
      req.session.user.id,
      feature
    )
    if (!u) {
      throw new ApiAuthorizationError(
        `User not allowed to access experimental feature ${feature}`
      )
    }
    return next()
  }
