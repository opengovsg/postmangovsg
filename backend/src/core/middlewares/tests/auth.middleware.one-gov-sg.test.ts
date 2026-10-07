import { NextFunction, Request, Response } from 'express'
import { InitAuthMiddleware } from '@core/middlewares/auth.middleware'
import { AuthService } from '@core/services/auth.service'
import {
  OneGovSgIdentity,
  OneGovSgService,
} from '@core/services/one-gov-sg.service'

const identity: OneGovSgIdentity = {
  sub: 'officer@agency.gov.sg',
  email: 'officer@agency.gov.sg',
}

const callback = async (whitelistResult: Promise<boolean>) => {
  const authService = {
    isWhitelistedEmail: jest.fn().mockReturnValue(whitelistResult),
  } as unknown as AuthService
  const oneGovSgService = {
    completeLogin: jest.fn().mockResolvedValue(identity),
  } as unknown as OneGovSgService
  const req = {
    get: () => 'onegovsg_tx=tx-id',
    baseUrl: '/v1/auth',
    body: { code: 'secret-code', state: 'secret-state' },
  } as unknown as Request
  const res = {
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  const next = jest.fn() as NextFunction

  await InitAuthMiddleware(authService, oneGovSgService).oneGovSgCallback(
    req,
    res,
    next
  )
  return { res, next }
}

test('rejects a user missing from the allowlist', async () => {
  const { res, next } = await callback(Promise.resolve(false))
  expect(res.status).toHaveBeenCalledWith(403)
  expect(next).not.toHaveBeenCalled()
})

test('forwards a whitelist database failure instead of reporting unauthorized', async () => {
  const failure = new Error('database unavailable')
  const { res, next } = await callback(Promise.reject(failure))
  expect(next).toHaveBeenCalledWith(failure)
  expect(res.status).not.toHaveBeenCalled()
})

test.each([
  ['sid-123', true],
  [undefined, false],
])(
  'logout reports whether the session was a one.gov.sg login (sid %s)',
  async (oneGovSgSid, expected) => {
    const req = {
      session: { oneGovSgSid, destroy: (cb: (err?: Error) => void) => cb() },
    } as unknown as Request
    const res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response

    await InitAuthMiddleware({} as AuthService, {} as OneGovSgService).logout(
      req,
      res,
      jest.fn()
    )
    expect(res.json).toHaveBeenCalledWith({ oneGovSg: expected })
  }
)
