import React, { useState, useContext, useEffect } from 'react'
import cx from 'classnames'
import { noop } from 'lodash'
import { TextInputWithButton, TextButton } from 'components/common'
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
import { Trans } from '@lingui/macro'

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
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId)
  })

  async function sendOtp() {
    resetButton()
    try {
      await getOtpWithEmail(email)
      setOtpSent(true)
      // Show resend button after wait time
      timeoutId = setTimeout(() => {
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

  return (
    <div className={styles.container}>
      <h3 className={styles.text}>
        {!otpSent ? (
          <Trans>Sign in with your gov.sg email</Trans>
        ) : (
          <Trans>One-Time Password</Trans>
        )}

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
      </h3>

      {!otpSent ? (
        <TextInputWithButton
          value={email}
          type={'email'}
          placeholder={i18n._(t`e.g. postman@agency.gov.sg`)}
          onChange={setEmail}
          buttonDisabled={!email}
          onClick={sendOtp}
          buttonLabel={<Trans>Get OTP</Trans>}
          loadingButtonLabel={<Trans>Sending OTP...</Trans>}
          errorMessage={errorMsg}
        />
      ) : (
        <TextInputWithButton
          value={otp}
          type={'tel'}
          placeholder={i18n._(t`Enter OTP`)}
          onChange={setOtp}
          buttonDisabled={!otp}
          onClick={login}
          buttonLabel={<Trans>Sign In</Trans>}
          loadingButtonLabel={<Trans>Verifying OTP...</Trans>}
          errorMessage={errorMsg}
        />
      )}
    </div>
  )
}

export default Login
