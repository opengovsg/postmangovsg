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
    errorHandler(e, {
      400: 'Invalid OTP format, enter 6 digits',
      401: 'Invalid OTP',
    })
  }
}

async function getUser(): Promise<{ email: string; id: number } | undefined> {
  try {
    const response = await axios.get('/auth/userinfo')
    return response.data
  } catch (e) {
    console.error(e)
  }

}

async function logout(): Promise<void> {
  return axios.get('/auth/logout')
}

function errorHandler(e: AxiosError, customHandlers: any = {}) {
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
  getUser,
  logout,
}