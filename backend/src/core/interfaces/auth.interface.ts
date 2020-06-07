export interface HashedOtp {
  hash: string
  retries: number
  createdAt: number // Date.getTime() milliseconds
}

export interface VerifyOtpInput {
  email: string
  otp: string
}
