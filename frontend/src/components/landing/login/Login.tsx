import React, { useState, useContext } from 'react'
import { TextInputWithButton, ErrorBlock } from 'components/common'
import { getOtpWithEmail, loginWithOtp } from 'services/auth.service'

import styles from './Login.module.scss'
import { AuthContext } from 'contexts/auth.context'

const emailText = 'Sign in with your gov.sg email'
const otpText = 'One-Time Password'
const emailButtonText = ['Get OTP', 'Sending OTP...']
const otpButtonText = ['Sign In', 'Verifying OTP...']
const emailPlaceholder = 'e.g. postman@agency.gov.sg'
const otpPlaceholder = 'enter OTP sent to your email'

const RESEND_WAIT_TIME = 30000

const Login = () => {
  const { setAuthenticated } = useContext(AuthContext)

  const [otpSent, setOtpSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [canResend, setCanResend] = useState(false)

  async function sendOtp() {
    resetButton()
    try {
      await getOtpWithEmail(email)
      setOtpSent(true)
      // Show resend button after wait time
      setTimeout(() => {
        setCanResend(true)
      }, RESEND_WAIT_TIME)
    } catch (err) {
      setErrorMsg(err.message)
    }
    setIsLoading(false)
  }

  async function login() {
    resetButton()
    try {
      await loginWithOtp(email, otp)
      setAuthenticated(true)
    } catch (err) {
      setErrorMsg(err.message)
    }
    setIsLoading(false)
  }

  function resetButton() {
    setIsLoading(true)
    setErrorMsg(null)
    setCanResend(false)
  }

  function resend() {
    setOtpSent(false)
    sendOtp()
  }

  function render(
    mainText: string,
    value: string,
    onChange: Function,
    onClick: Function,
    buttonText: string[],
    placeholder: string,
    inputType?: string,
  ) {
    return (
      <>
        <h4 className={styles.text}>
          {mainText}
          {otpSent && canResend &&
            <a className={styles.resend} onClick={resend}>Resend?</a>
          }
        </h4>
        <TextInputWithButton
          value={value}
          type={inputType}
          placeholder={placeholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          buttonDisabled={isLoading}
          inputDisabled={isLoading}
          onClick={onClick}>
          {isLoading ? buttonText[1] : buttonText[0]}
        </TextInputWithButton>
        <ErrorBlock className={styles.errorBlock}>
          {errorMsg}
        </ErrorBlock>
      </>
    )
  }

  return (
    <div className={styles.container}>
      {!otpSent ?
        render(emailText, email, setEmail, sendOtp, emailButtonText, emailPlaceholder, 'email')
        :
        render(otpText, otp, setOtp, login, otpButtonText, otpPlaceholder, 'tel')
      }
    </div >
  )
}

export default Login
