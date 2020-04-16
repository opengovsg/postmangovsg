import axios from 'axios'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function getOtpWithEmail(email: string): Promise<void> {
  await sleep(1000)
  return Promise.resolve()
}

async function loginWithOtp(email: string, otp: string): Promise<void> {
  await sleep(1000)
  return Promise.resolve()
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