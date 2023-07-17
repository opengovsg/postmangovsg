import { ApiAuthorizationError } from '@core/errors/rest-api.errors'
import { experimentService } from '@core/services'
import { NextFunction, Request, Response } from 'express'

export const experimentalUserOnly =
  (feature: string) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const u = await experimentService.getExperimentalUser(
      req.session?.user.id, // safe because authentication middleware has guaranteed this
      feature
    )
    if (!u) {
      throw new ApiAuthorizationError(
        `User not allowed to access experimental feature ${feature}`
      )
    }
    return next()
  }
