import React, { useState } from 'react'
import { TextInputWithButton } from 'components/common'
import { getOtpWithEmail, loginWithOtp } from 'services/auth.service'

import styles from './Login.module.scss'

const emailText = 'Sign in with your gov.sg email'
const otpText = 'Enter the 6-digit One Time Password sent to your email'
const emailButtonText = 'Get OTP'
const otpButtonText = 'Sign In'

const Login = () => {
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  async function sendOtp() {
    try {
      await getOtpWithEmail(email)
      setOtpSent(true)
    } catch (err) {
      console.log(err)
    }
  }

  async function login() {
    try {
      const resp = await loginWithOtp(email, otp)
      console.log(resp)
    } catch (err) {
      console.log(err)
    }
  }

  function render(mainText: string, value: string, onChange: Function, onClick: Function, buttonText: string, inputType?: string) {
    return (
      <>
        <h4 className={styles.text}>
          {mainText}
        </h4>
        <TextInputWithButton
          value={value}
          type={inputType}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onClick={onClick}>
          {buttonText}
        </TextInputWithButton>
      </>
    )
  }

  return (
    <div className={styles.container}>
      {!otpSent ?
        render(emailText, email, setEmail, sendOtp, emailButtonText, 'email')
        :
        render(otpText, otp, setOtp, login, otpButtonText, 'tel')
      }
    </div >
  )
}

export default Login