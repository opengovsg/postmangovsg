import crypto from 'crypto'
import { BaseClient, custom, generators, Issuer } from 'openid-client'
import config from '@core/config'
import { RedisService } from '@core/services/redis.service'

/**
 * one.gov.sg OIDC relying party (auth code + PKCE, private_key_jwt), via openid-client.
 * Spec: https://developer.one.gov.sg/integration-guide
 */

const TX_TTL_SECONDS = 10 * 60
const HTTP_TIMEOUT_MS = 10 * 1000
const TX_KEY_PREFIX = 'oneGovSgTx:'

// Process-wide: openid-client is only used here
custom.setHttpOptionsDefaults({ timeout: HTTP_TIMEOUT_MS })

interface LoginTransaction {
  state: string
  nonce: string
  codeVerifier: string
}

/** Callback rejected before/while validating params. Maps to 400. */
export class OneGovSgCallbackError extends Error {}

export interface OneGovSgService {
  startLogin(): Promise<{ txId: string; url: string }>
  completeLogin(
    txId: string | undefined,
    query: Record<string, unknown>
  ): Promise<OneGovSgIdentity>
}

export interface OneGovSgIdentity {
  sub: string
  email: string
  sid?: string
}

export const InitOneGovSgService = (
  redisService: RedisService
): OneGovSgService => {
  // redirectUri is the frontend page one.gov.sg redirects to; it posts the code to the backend.
  // Must match the URI registered with one.gov.sg byte-for-byte.
  const { issuer, clientId, privateKey, redirectUri } = config.get('oneGovSg')
  if (clientId && !redirectUri) {
    throw new Error(
      'ONE_GOV_SG_REDIRECT_URI is required with ONE_GOV_SG_CLIENT_ID'
    )
  }

  // ponytail: discovery cached for process lifetime, restart to pick up endpoint changes.
  // JWKS caching and refetch on key rotation are handled by openid-client.
  let client: Promise<BaseClient> | undefined
  const getClient = (): Promise<BaseClient> => {
    if (!client) {
      client = (async () => {
        const discovered = await Issuer.discover(issuer)
        // RFC 9207 mix-up defence relies on this being the full issuer incl. /api/auth
        if (discovered.issuer !== issuer) {
          throw new Error('one.gov.sg discovery issuer mismatch')
        }
        const c = new discovered.Client(
          {
            client_id: clientId,
            token_endpoint_auth_method: 'private_key_jwt',
            token_endpoint_auth_signing_alg: 'RS256',
            id_token_signed_response_alg: 'RS256',
          },
          {
            keys: [
              {
                ...crypto
                  .createPrivateKey(privateKey)
                  .export({ format: 'jwk' }),
                alg: 'RS256',
                use: 'sig',
              },
            ],
          }
        )
        c[custom.clock_tolerance] = 60
        return c
      })()
      client.catch(() => (client = undefined))
    }
    return client
  }

  /** Atomically load and delete the login transaction so it is single-use */
  const takeTransaction = (txId: string): Promise<LoginTransaction | null> => {
    const key = TX_KEY_PREFIX + txId
    return new Promise((resolve, reject) =>
      redisService.sessionClient
        .multi()
        .get(key)
        .del(key)
        .exec((err, replies) =>
          err
            ? reject(err)
            : resolve(replies[0] ? JSON.parse(replies[0]) : null)
        )
    )
  }

  const startLogin = async (): Promise<{ txId: string; url: string }> => {
    const c = await getClient()
    const tx: LoginTransaction = {
      state: generators.state(),
      nonce: generators.nonce(),
      codeVerifier: generators.codeVerifier(),
    }
    const txId = generators.random()
    await new Promise<void>((resolve, reject) =>
      redisService.sessionClient.set(
        TX_KEY_PREFIX + txId,
        JSON.stringify(tx),
        'EX',
        TX_TTL_SECONDS,
        (err) => (err ? reject(err) : resolve())
      )
    )

    const url = c.authorizationUrl({
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid email',
      state: tx.state,
      nonce: tx.nonce,
      code_challenge: generators.codeChallenge(tx.codeVerifier),
      code_challenge_method: 'S256',
    })
    return { txId, url }
  }

  const completeLogin = async (
    txId: string | undefined,
    query: Record<string, unknown>
  ): Promise<OneGovSgIdentity> => {
    // Order matters: garbage callbacks die before any token exchange.
    // openid-client repeats these checks; doing them here maps them to a 400.
    const tx = txId ? await takeTransaction(txId) : null
    if (!tx) throw new OneGovSgCallbackError('Login expired, please try again')
    if (query.error !== undefined) {
      throw new OneGovSgCallbackError(`one.gov.sg returned an error`)
    }
    if (query.state !== tx.state) {
      throw new OneGovSgCallbackError('State mismatch')
    }
    // RFC 9207: required, even if discovery doesn't advertise support
    if (query.iss !== issuer) throw new OneGovSgCallbackError('Issuer mismatch')
    if (typeof query.code !== 'string' || !query.code) {
      throw new OneGovSgCallbackError('Missing code')
    }

    const c = await getClient()
    // Verifies id_token signature, iss, aud, azp, exp, iat, nonce
    const tokenSet = await c.callback(
      redirectUri,
      { code: query.code, state: query.state, iss: query.iss },
      {
        response_type: 'code',
        state: tx.state,
        nonce: tx.nonce,
        code_verifier: tx.codeVerifier,
      },
      // openid-client defaults aud to the issuer; one.gov.sg expects the token endpoint
      { clientAssertionPayload: { aud: c.issuer.metadata.token_endpoint } }
    )

    // Access token is opaque and unused; identity comes from id_token only
    const claims = tokenSet.claims()
    // Stricter than openid-client, which allows extra audiences when azp is set
    const aud = ([] as string[]).concat(claims.aud)
    if (aud.length !== 1 || aud[0] !== clientId) {
      throw new Error('id_token aud is not exactly client_id')
    }

    // one.gov.sg sets `sub` to the user's email, so Postman accounts key on it directly
    if (typeof claims.sub !== 'string') {
      throw new Error('id_token sub is not a string')
    }

    return {
      sub: claims.sub,
      email: claims.sub.trim().toLowerCase(),
      sid: typeof claims.sid === 'string' ? claims.sid : undefined,
    }
  }

  return { startLogin, completeLogin }
}
