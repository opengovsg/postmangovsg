import React, { useState } from 'react'
import { TextInputWithButton } from 'components/common'
import styles from './Login.module.scss'

const emailText = 'Sign in with your gov.sg email'
const otpText = 'Enter the 6-digit One Time Password sent to your email'
const emailButtonText = 'Get OTP'
const otpButtonText = 'Sign In'

const Login = () => {
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  function sendOtp() {
    setOtpSent(true)
  }

  function login() {
    setOtpSent(true)
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