import axios from 'axios'

async function getOtpWithEmail(email: string): Promise<void> {
  return axios.post('/auth/otp', {
    email,
  })
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  return axios.post('/auth/login', {
    email, otp,
  })
}

async function getIsLoggedIn(): Promise<boolean> {
  return axios.get('/auth/login').then((response) => {
    return response.status === 200
  })
}

async function logout(): Promise<void> {
  return axios.get('/auth/logout')
}

export {
  getOtpWithEmail,
  loginWithOtp,
  getIsLoggedIn,
  logout,
}