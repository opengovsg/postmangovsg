import axios from 'axios'
import { POSTMAN_API_BASEURL } from 'config'

async function getOtpWithEmail(email: string): Promise<void> {
  return axios.post(`${POSTMAN_API_BASEURL}/auth/otp`, {
    email,
  }, {
    withCredentials: true,
  })
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  return axios.post(`${POSTMAN_API_BASEURL}/auth/login`, {
    email, otp,
  }, {
    withCredentials: true,
  })
}

async function getIsLoggedIn(): Promise<boolean> {
  return axios.get(`${POSTMAN_API_BASEURL}/auth/login`, {
    withCredentials: true,
  }).then((response) => {
    return response.status === 200
  })
}

async function logout(): Promise<void> {
  return axios.get(`${POSTMAN_API_BASEURL}/auth/logout`, {
    withCredentials: true,
  })
}

export {
  getOtpWithEmail,
  loginWithOtp,
  getIsLoggedIn,
  logout,
}