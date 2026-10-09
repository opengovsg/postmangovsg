import { Trans, t } from '@lingui/macro'
import cx from 'classnames'

import { noop } from 'lodash'

import React, { useState, useContext, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import styles from './LoginInput.module.scss'

import ErrorImage from 'assets/img/failure.png'
import {
  TextInputWithButton,
  TextButton,
  PrimaryButton,
  ConfirmModal,
} from 'components/common'
import { takeOneGovSgCallbackParams } from 'components/login/one-gov-sg-callback'
import {
  ONE_GOV_SG_CALLBACK_PATH,
  ONE_GOV_SG_ENABLED,
  ONE_GOV_SG_START_PATH,
} from 'config'
import { AuthContext } from 'contexts/auth.context'

import { ModalContext } from 'contexts/modal.context'
import {
  getOtpWithEmail,
  loginWithOtp,
  loginWithOneGovSg,
  getUser,
  setUserAnalytics,
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
  const [canResend, setCanResend] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const modalContext = useContext(ModalContext)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId)
  })

  const openErrorModal = (errorString: string) =>
    modalContext.setModalContent(
      <ConfirmModal
        title={`Unable to sign in`}
        subtitleElement={
          <h4 className={styles.subtitleElement}>{errorString}</h4>
        }
        buttonText="Okay"
        alternateImage={ErrorImage}
        primary={true}
        onConfirm={() => modalContext.close()}
      />
    )

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
      openErrorModal((err as Error).message)
      sendException((err as Error).message)
    }
  }

  async function login() {
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
      openErrorModal((err as Error).message)
      sendException((err as Error).message)
    }
  }

  // one.gov.sg redirects back here; the backend exchanges the code
  async function loginOneGovSg(params: Record<string, string>) {
    try {
      await loginWithOneGovSg(params)
      const user = await getUser()
      if (!user?.email) {
        throw new Error('Unable to confirm your sign-in. Please try again.')
      }
      setAuthenticated(true)
      setAuthContextEmail(user.email)
      setExperimentalData(
        user.experimental_data as { [feature: string]: Record<string, string> }
      )
      setUserAnalytics(user)
      navigate('/campaigns', { replace: true })
    } catch (err) {
      // Leave the callback route after a failed sign-in.
      navigate('/login', { replace: true })
      openErrorModal((err as Error).message)
      sendException((err as Error).message)
    }
  }

  useEffect(() => {
    if (pathname === ONE_GOV_SG_CALLBACK_PATH) {
      void loginOneGovSg(takeOneGovSgCallbackParams())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetButton() {
    setCanResend(false)
    setOtp('')
  }

  async function resend() {
    sendUserEvent(GA_USER_EVENTS.RESEND_OTP)
    setIsResending(true)
    await sendOtp()
    setIsResending(false)
  }

  if (pathname === ONE_GOV_SG_CALLBACK_PATH) {
    return <i className="spinner bx bx-loader-alt bx-spin"></i>
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
          type="email"
          placeholder={t`e.g. postman@agency.gov.sg`}
          onChange={setEmail}
          buttonDisabled={!email}
          onClick={sendOtp}
          buttonLabel={<Trans>Get OTP</Trans>}
          loadingButtonLabel={<Trans>Sending OTP...</Trans>}
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
        />
      )}
      {!otpSent && ONE_GOV_SG_ENABLED && (
        <React.Fragment>
          <h4 className={styles.text}>
            <Trans>or</Trans>
          </h4>
          <PrimaryButton onClick={() => navigate(ONE_GOV_SG_START_PATH)}>
            Log in with one.gov.sg
          </PrimaryButton>
        </React.Fragment>
      )}
    </div>
  )
}

export default Login
