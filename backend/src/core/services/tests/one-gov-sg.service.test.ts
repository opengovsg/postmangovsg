import crypto from 'crypto'
import http from 'http'
import { AddressInfo } from 'net'
import jwt from 'jsonwebtoken'
import config from '@core/config'
import {
  InitOneGovSgService,
  OneGovSgCallbackError,
  OneGovSgService,
} from '@core/services/one-gov-sg.service'
import { RedisService } from '@core/services/redis.service'

const CLIENT_ID = 'postman-test'
const idpKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const clientKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })

// Minimal in-memory stand-in for the redis calls the service makes
const store = new Map<string, string>()
const fakeRedis = {
  sessionClient: {
    set: (k: string, v: string, _ex: string, _ttl: number, cb: any) => {
      store.set(k, v)
      cb(null)
    },
    multi: () => {
      let key = ''
      const chain = {
        get: (k: string) => ((key = k), chain),
        del: () => chain,
        exec: (cb: any) => {
          const v = store.get(key) ?? null
          store.delete(key)
          cb(null, [v, 1])
        },
      }
      return chain
    },
  },
} as unknown as RedisService

// Fake one.gov.sg IdP on a local port; openid-client makes real HTTP calls
let issuer: string
let tokenRequest: URLSearchParams
let nonce: string
let idTokenClaims: (nonce: string) => Record<string, unknown>
const idp = http.createServer((req, res) => {
  const json = (body: unknown) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  if (req.url === '/api/auth/.well-known/openid-configuration') {
    return json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
    })
  }
  if (req.url === '/api/auth/jwks') {
    const jwk = idpKey.publicKey.export({ format: 'jwk' })
    return json({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'sig' }] })
  }
  if (req.url === '/api/auth/token' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      tokenRequest = new URLSearchParams(body)
      const idToken = jwt.sign(
        idTokenClaims(nonce),
        idpKey.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        { algorithm: 'RS256', keyid: 'k1' }
      )
      json({ id_token: idToken, access_token: 'opaque', token_type: 'Bearer' })
    })
    return
  }
  res.statusCode = 404
  res.end()
})

beforeAll(async () => {
  await new Promise<void>((resolve) => idp.listen(0, '127.0.0.1', resolve))
  issuer = `http://127.0.0.1:${(idp.address() as AddressInfo).port}/api/auth`
  config.set('oneGovSg.issuer', issuer)
  config.set('oneGovSg.clientId', CLIENT_ID)
  config.set(
    'oneGovSg.redirectUri',
    'https://postman.gov.sg/login/one-gov-sg/callback'
  )
  config.set(
    'oneGovSg.privateKey',
    clientKey.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  )
})

afterAll(() => new Promise((resolve) => idp.close(resolve)))

const now = () => Math.floor(Date.now() / 1000)
const goodClaims = (nonce: string) => ({
  iss: issuer,
  sub: 'Officer@Agency.gov.sg',
  aud: CLIENT_ID,
  exp: now() + 300,
  iat: now(),
  nonce,
  sid: 'sid-1',
})

// Starts a login and returns a callback query the IdP would send
const start = async (svc: OneGovSgService) => {
  const { txId, url } = await svc.startLogin()
  const params = new URL(url).searchParams
  nonce = params.get('nonce') as string
  return {
    txId,
    params,
    query: { code: 'c', state: params.get('state'), iss: issuer },
  }
}

describe('one-gov-sg service', () => {
  test('happy path returns sub/email/sid and sends PKCE + private_key_jwt', async () => {
    idTokenClaims = goodClaims
    const svc = InitOneGovSgService(fakeRedis)
    const { txId, params, query } = await start(svc)
    expect(params.get('scope')).toBe('openid email')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('redirect_uri')).toBe(
      'https://postman.gov.sg/login/one-gov-sg/callback'
    )

    await expect(svc.completeLogin(txId, query)).resolves.toEqual({
      sub: 'Officer@Agency.gov.sg',
      email: 'officer@agency.gov.sg',
      sid: 'sid-1',
    })

    expect(tokenRequest.get('redirect_uri')).toBe(params.get('redirect_uri'))
    const verifier = tokenRequest.get('code_verifier') as string
    expect(
      crypto.createHash('sha256').update(verifier).digest('base64url')
    ).toBe(params.get('code_challenge'))
    const assertion = jwt.verify(
      tokenRequest.get('client_assertion') as string,
      clientKey.publicKey.export({ type: 'spki', format: 'pem' }),
      { algorithms: ['RS256'], audience: `${issuer}/token` }
    ) as Record<string, unknown>
    expect(assertion.iss).toBe(CLIENT_ID)
    expect(assertion.sub).toBe(CLIENT_ID)
    expect(assertion.jti).toBeTruthy()

    // transaction is single-use
    await expect(svc.completeLogin(txId, query)).rejects.toBeInstanceOf(
      OneGovSgCallbackError
    )
  })

  test.each([
    ['bad state', { state: 'x' }],
    ['bare-origin iss', { iss: new URL('http://a').origin }],
    ['missing code', { code: undefined }],
    ['idp error', { error: 'access_denied' }],
  ])('rejects callback with %s', async (_name, override) => {
    const svc = InitOneGovSgService(fakeRedis)
    const { txId, query } = await start(svc)
    await expect(
      svc.completeLogin(txId, { ...query, ...override })
    ).rejects.toBeInstanceOf(OneGovSgCallbackError)
  })

  test.each([
    ['wrong nonce', (n: string) => ({ ...goodClaims(n), nonce: 'other' })],
    ['wrong iss', (n: string) => ({ ...goodClaims(n), iss: 'http://evil' })],
    ['extra aud', (n: string) => ({ ...goodClaims(n), aud: [CLIENT_ID, 'x'] })],
    ['wrong azp', (n: string) => ({ ...goodClaims(n), azp: 'x' })],
    ['missing sub', (n: string) => ({ ...goodClaims(n), sub: undefined })],
    ['non-string sub', (n: string) => ({ ...goodClaims(n), sub: 123 })],
    ['expired', (n: string) => ({ ...goodClaims(n), exp: now() - 120 })],
  ])('rejects id_token with %s', async (_name, claims) => {
    idTokenClaims = claims
    const svc = InitOneGovSgService(fakeRedis)
    const { txId, query } = await start(svc)
    await expect(svc.completeLogin(txId, query)).rejects.toThrow()
  })
})
