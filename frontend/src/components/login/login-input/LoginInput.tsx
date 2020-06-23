import React, { useState, useContext } from 'react'
import * as Sentry from '@sentry/browser'
import { TextInputWithButton, ErrorBlock } from 'components/common'
import {
  getOtpWithEmail,
  loginWithOtp,
  getUser,
  setUserAnalytics,
} from 'services/auth.service'

import styles from './LoginInput.module.scss'
import { AuthContext } from 'contexts/auth.context'
import {
  GA_USER_EVENTS,
  setGAUserId,
  sendUserEvent,
  sendException,
} from 'services/ga.service'

const emailText = 'Sign in with your gov.sg email'
const otpText = 'One-Time Password'
const emailButtonText = ['Get OTP', 'Sending OTP...']
const otpButtonText = ['Sign In', 'Verifying OTP...']
const emailPlaceholder = 'e.g. postman@agency.gov.sg'
const otpPlaceholder = 'Enter OTP'

const RESEND_WAIT_TIME = 30000

const Login = () => {
  const { setAuthenticated, setEmail: setAuthContextEmail } = useContext(
    AuthContext
  )

  const [otpSent, setOtpSent] = useState(false)
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
  }

  async function login() {
    resetButton()
    try {
      await loginWithOtp(email, otp)
      setAuthenticated(true)
      setAuthContextEmail(email)
      const user = await getUser()
      setUserAnalytics(user)
    } catch (err) {
      setErrorMsg(err.message)
      sendException(err.message)
    }
  }

  function resetButton() {
    setErrorMsg(null)
    setCanResend(false)
  }

  function resend() {
    setOtpSent(false)
    sendOtp()
    sendUserEvent(GA_USER_EVENTS.RESEND_OTP)
  }

  function render(
    mainText: string,
    value: string,
    onChange: (value: string) => void,
    onClick: () => Promise<void>,
    buttonText: string[],
    placeholder: string,
    inputType?: string
  ) {
    return (
      <>
        <h4 className={styles.text}>
          {mainText}
          {otpSent && canResend && (
            <a className={styles.resend} onClick={resend}>
              Resend?
            </a>
          )}
        </h4>
        <TextInputWithButton
          value={value}
          type={inputType}
          placeholder={placeholder}
          onChange={onChange}
          buttonDisabled={!value}
          onClick={onClick}
          buttonLabel={buttonText[0]}
          loadingButtonLabel={buttonText[1]}
        />
        <ErrorBlock absolute={true}>{errorMsg}</ErrorBlock>
      </>
    )
  }

  return (
    <div className={styles.container}>
      {!otpSent
        ? render(
            emailText,
            email,
            setEmail,
            sendOtp,
            emailButtonText,
            emailPlaceholder,
            'email'
          )
        : render(
            otpText,
            otp,
            setOtp,
            login,
            otpButtonText,
            otpPlaceholder,
            'tel'
          )}
    </div>
  )
}

export default Login
