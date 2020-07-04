import React, { useState, useContext } from 'react'
import cx from 'classnames'
import { noop } from 'lodash'
import { TextInputWithButton, ErrorBlock, TextButton } from 'components/common'
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
  sendUserEvent,
  sendException,
} from 'services/ga.service'
import { i18n } from 'locales'
import { t } from '@lingui/macro'
import { Trans } from '@lingui/react'

const emailText = i18n._(t`Sign in with your gov.sg email`)
const otpText = i18n._(t`One-Time Password`)
const emailButtonText = [i18n._(t`Get OTP`), i18n._(t`Sending OTP...`)]
const otpButtonText = [i18n._(t`Sign In`), i18n._(t`Verifying OTP...`)]
const emailPlaceholder = i18n._(t`e.g. postman@agency.gov.sg`)
const otpPlaceholder = i18n._(t`Enter OTP`)

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
  const [isResending, setIsResending] = useState(false)

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
      setCanResend(true)
      setErrorMsg(err.message)
      sendException(err.message)
    }
  }

  async function login() {
    setErrorMsg(null)
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
    setOtp('')
  }

  async function resend() {
    sendUserEvent(GA_USER_EVENTS.RESEND_OTP)
    setIsResending(true)
    await sendOtp()
    setIsResending(false)
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
          {otpSent && (
            <TextButton
              className={cx(styles.resend, { [styles.disabled]: !canResend })}
              onClick={canResend ? resend : noop}
            >
              {isResending ? (
                <Trans>Resending OTP...</Trans>
              ) : (
                <Trans>Resend?</Trans>
              )}
            </TextButton>
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
