import * as Sentry from '@sentry/browser'
import axios from 'axios'

import { setGAUserId } from './ga.service'

async function getOtpWithEmail(email: string): Promise<void> {
  try {
    await axios.post('/auth/otp', {
      email,
    })
  } catch (e) {
    errorHandler(e)
  }
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  try {
    await axios.post('/auth/login', {
      email,
      otp,
    })
  } catch (e) {
    errorHandler(e, {
      400: 'Invalid OTP format, enter 6 digits',
      401: 'Invalid OTP',
    })
  }
}

async function getUser(): Promise<
  | {
      email: string
      id: number
      experimental_data: { [key: string]: Record<string, string> }
    }
  | undefined
> {
  try {
    const response = await axios.get('/auth/userinfo')
    return response.data
  } catch (e) {
    console.error(e)
  }
}

async function logout(): Promise<void> {
  return axios.get('/auth/logout').then(() => {
    setUserAnalytics(null)
  })
}

function setUserAnalytics(user?: { email: string; id: number } | null) {
  // set user id to track logged in user
  setGAUserId(user?.id || null)

  Sentry.configureScope((scope) => {
    const scopeUser = user?.email
      ? { email: user?.email, id: `${user?.id}` }
      : null
    scope.setUser(scopeUser)
  })
}

function errorHandler(e: unknown, customHandlers: any = {}) {
  if (axios.isAxiosError(e) && e.response && e.response.status) {
    const code = e.response.status
    if (customHandlers[code]) {
      throw new Error(customHandlers[code])
    } else if (e.response.data?.message) {
      throw new Error(e.response.data.message)
    } else {
      throw new Error(e.response.statusText)
    }
  }
  throw new Error(`${e}`)
}

export { getOtpWithEmail, loginWithOtp, getUser, logout, setUserAnalytics }
