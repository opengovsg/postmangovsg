import axios from 'axios'
import { POSTMAN_API_BASEURL } from 'config'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function getOtpWithEmail(email: string): Promise<void> {
  return axios.post(`${POSTMAN_API_BASEURL}/v1/auth/otp`, {
    email,
  }, {
    withCredentials: true,
  })
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  return axios.post(`${POSTMAN_API_BASEURL}/v1/auth/login`, {
    email, otp,
  }, {
    withCredentials: true,
  })
}

async function getIsLoggedIn(): Promise<boolean> {
  await sleep(1000)
  return Promise.resolve(true)
}

export {
  getOtpWithEmail,
  loginWithOtp,
  getIsLoggedIn,
}