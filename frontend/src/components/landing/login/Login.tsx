import React, { useState, useContext } from 'react'
import { TextInputWithButton, ErrorBlock } from 'components/common'
import { getOtpWithEmail, loginWithOtp, getUser } from 'services/auth.service'

import { LOGIN_EMAIL_TEXT, LOGIN_EMAIL_PLACEHOLDER } from 'config'
import styles from './Login.module.scss'
import { AuthContext } from 'contexts/auth.context'
import { GA_USER_EVENTS, setGAUserId, sendUserEvent, sendException } from 'services/ga.service'

const emailText = LOGIN_EMAIL_TEXT
const otpText = 'One-Time Password'
const emailButtonText = ['Get OTP', 'Sending OTP...']
const otpButtonText = ['Sign In', 'Verifying OTP...']
const emailPlaceholder = LOGIN_EMAIL_PLACEHOLDER
const otpPlaceholder = 'Enter OTP'
const invalidOtpFormat = 'Invalid OTP format, enter 6 digits'

const RESEND_WAIT_TIME = 30000

const Login = () => {
  const { setAuthenticated, setEmail: setAuthContextEmail } = useContext(AuthContext)

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
      sendException(err.message)
    }
    setIsLoading(false)
  }

  async function login() {
    resetButton()
    try {
      if (!validateOtp(otp)) {
        throw new Error(invalidOtpFormat)
      }

      await loginWithOtp(email, otp)
      setAuthenticated(true)
      setAuthContextEmail(email)
      const user = await getUser()
      setGAUserId(user?.id || null)
    } catch (err) {
      setErrorMsg(err.message)
      sendException(err.message)
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
    sendUserEvent(GA_USER_EVENTS.RESEND_OTP)
  }

  function validateOtpInput(value: string) {
    // Only accept input that is between 0-6 digits
    if (!/^\d{0,6}$/.test(value)) {
      return
    }
    setOtp(value)
  }

  function validateOtp(value: string) {
    return /^\d{6}$/.test(value)
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
          onChange={onChange}
          buttonDisabled={!value || (otp && !validateOtp(otp)) || isLoading}
          inputDisabled={isLoading}
          onClick={onClick}>
          {isLoading ? buttonText[1] : buttonText[0]}
        </TextInputWithButton>
        <ErrorBlock absolute={true}>
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
        render(otpText, otp, validateOtpInput, login, otpButtonText, otpPlaceholder, 'tel')
      }
    </div >
  )
}

export default Login
