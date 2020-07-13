import config from '../config'
export const isAuthenticated = (authHeader?: string) => {
  const headerKey = 'Basic'
  if (!authHeader) return false

  const [header, secret] = authHeader.trim().split(' ')
  if (headerKey !== header) return false

  const decoded = Buffer.from(secret, 'base64').toString('utf8')
  const authorized = decoded === config.get('callbackSecret')
  if (!authorized)
    console.log(`Request made with incorrect credential ${decoded}`)
  return authorized
}
