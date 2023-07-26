import { Trans, t } from '@lingui/macro'
import cx from 'classnames'

import { noop } from 'lodash'

import React, { useState, useContext, useEffect } from 'react'

import styles from './LoginInput.module.scss'

import {
  TextInputWithButton,
  TextButton,
  PrimaryButton,
  ErrorBlock,
  InfoBlock,
} from 'components/common'
import { AuthContext } from 'contexts/auth.context'

import {
  getOtpWithEmail,
  loginWithOtp,
  getUser,
  setUserAnalytics,
  getSgidUrl,
} from 'services/auth.service'

import {
  GA_USER_EVENTS,
  sendUserEvent,
  sendException,
} from 'services/ga.service'

const RESEND_WAIT_TIME = 30000

const Login = () => {
  const {
    setAuthenticated,
    setEmail: setAuthContextEmail,
    setExperimentalData,
  } = useContext(AuthContext)

  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [canResend, setCanResend] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [sgidErrorMsg, setSgidErrorMsg] = useState('')
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId)
  })

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const errorCode = params.get('errorCode')
    if (errorCode) {
      setSgidErrorMsg(errorCode)
    } else {
      setSgidErrorMsg('')
    }
  }, [setSgidErrorMsg])

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
      setErrorMsg((err as Error).message)
      sendException((err as Error).message)
    }
  }

  async function login() {
    setErrorMsg('')
    try {
      await loginWithOtp(email, otp)
      setAuthenticated(true)
      setAuthContextEmail(email)
      const user = await getUser()
      setExperimentalData(
        user?.experimental_data as { [feature: string]: Record<string, string> }
      )
      setUserAnalytics(user)
    } catch (err) {
      setErrorMsg((err as Error).message)
      sendException((err as Error).message)
    }
  }

  async function sgidLogin() {
    setErrorMsg('')
    try {
      const authUrl = await getSgidUrl()
      if (authUrl) {
        window.location.assign(authUrl)
      }
    } catch (err) {
      setErrorMsg((err as Error).message)
      sendException((err as Error).message)
    }
  }

  function resetButton() {
    setErrorMsg('')
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
        {sgidErrorMsg && <ErrorBlock>{sgidErrorMsg}</ErrorBlock>}
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
          type="email"
          placeholder={t`e.g. postman@agency.gov.sg`}
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
          type="text"
          placeholder={t`Enter OTP`}
          onChange={setOtp}
          buttonDisabled={!otp}
          onClick={login}
          buttonLabel={<Trans>Sign In</Trans>}
          loadingButtonLabel={<Trans>Verifying OTP...</Trans>}
          errorMessage={errorMsg}
        />
      )}
      {/* This feature is experimental and should only be rendered on the demo URL (/login/sgid) */}
      {window.location.pathname.includes('ogp-login') && !otpSent && (
        <React.Fragment>
          <h4 className={styles.text}>
            <Trans>or</Trans>
          </h4>
          <InfoBlock className={styles.info}>
            This is an experimental service currently offered to OGP officers
            only.
          </InfoBlock>
          <PrimaryButton onClick={sgidLogin}>
            Log in with Singpass
          </PrimaryButton>
        </React.Fragment>
      )}
    </div>
  )
}

export default Login
