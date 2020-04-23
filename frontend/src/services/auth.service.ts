import axios, { AxiosError } from 'axios'

async function getOtpWithEmail(email: string): Promise<void> {
  try {
    await axios.post('/auth/otp', {
      email,
    })
  } catch (e) {
    errorHandler(e, { 401: 'User is not authorized' })
  }
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  try {
    await axios.post('/auth/login', {
      email, otp,
    })
  } catch (e) {
    errorHandler(e, { 401: 'Invalid OTP' })
  }
}

async function getIsLoggedIn(): Promise<boolean> {
  return axios.get('/auth/login').then((response) => {
    return response.status === 200
  })
}

async function logout(): Promise<void> {
  return axios.get('/auth/logout')
}

function errorHandler(e: AxiosError, customHandlers: any) {
  if (e.response && e.response.status) {
    const code = e.response.status
    if (customHandlers[code]) {
      throw new Error(customHandlers[code])
    } else {
      throw new Error(e.response.statusText)
    }
  }
  throw new Error(`${e}`)
}

export {
  getOtpWithEmail,
  loginWithOtp,
  getIsLoggedIn,
  logout,
}