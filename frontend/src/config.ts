import axios from 'axios'

/**
 * React env vars are used for injecting variables at build time
 * https://create-react-app.dev/docs/adding-custom-environment-variables/#referencing-environment-variables-in-the-html
 */
const missingEnvVars = [
  'REACT_APP_TITLE',
  'REACT_APP_DESCRIPTION',
  'REACT_APP_BACKEND_URL',
  'REACT_APP_GUIDE_URL',
  'REACT_APP_GUIDE_CREDENTIALS_URL',
  'REACT_APP_GUIDE_POWER_USER_URL',
  'REACT_APP_CONTACT_US_URL',
  'REACT_APP_LOGIN_EMAIL_TEXT',
  'REACT_APP_LOGIN_EMAIL_PLACEHOLDER',
  'REACT_APP_CONTRIBUTE_URL',
].reduce(function (acc: string[], name: string){
  if (process.env[name] === undefined) acc.push(name)
  return acc
},[])
if (missingEnvVars.length>0){
  throw new Error(`Missing required environment variables: ${missingEnvVars}`)
}

// axios global defaults
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL as string
axios.defaults.withCredentials = true
axios.defaults.timeout = 10000 // 10s

export const GUIDE_URL = process.env.REACT_APP_GUIDE_URL as string
export const GUIDE_CREDENTIALS_URL = process.env.REACT_APP_GUIDE_CREDENTIALS_URL as string
export const GUIDE_POWER_USER_URL = process.env.REACT_APP_GUIDE_POWER_USER_URL as string
export const CONTACT_US_URL = process.env.REACT_APP_CONTACT_US_URL as string
export const LOGIN_EMAIL_TEXT = process.env.REACT_APP_LOGIN_EMAIL_TEXT as string
export const LOGIN_EMAIL_PLACEHOLDER = process.env.REACT_APP_LOGIN_EMAIL_PLACEHOLDER as string
export const CONTRIBUTE_URL = process.env.REACT_APP_CONTRIBUTE_URL as string
