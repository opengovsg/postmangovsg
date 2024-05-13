import { Trans, t } from '@lingui/macro'
import cx from 'classnames'

import { noop } from 'lodash'

import React, { useState, useContext, useEffect } from 'react'

import styles from './LoginInput.module.scss'

import ErrorImage from 'assets/img/failure.png'
import {
  TextInputWithButton,
  TextButton,
  PrimaryButton,
  ConfirmModal,
} from 'components/common'
import { AuthContext } from 'contexts/auth.context'

import { ModalContext } from 'contexts/modal.context'
import {
  getOtpWithEmail,
  loginWithOtp,
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
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId)
  })

  const openErrorModal = (errorString: string) =>
    modalContext.setModalContent(
      <ConfirmModal
        title={`Singpass login is unavailable`}
        subtitleElement={
          <h4 className={styles.subtitleElement}>{errorString}</h4>
        }
        buttonText="Okay"
        alternateImage={ErrorImage}
        primary={true}
        onConfirm={() => modalContext.close()}
      />
    )

  const openSgidUnavailableModal = () =>
    modalContext.setModalContent(
      <ConfirmModal
        title={`Singpass login is unavailable`}
        subtitleElement={
          <h4 className={styles.subtitleElement}>
            From 5pm, 3 May onwards, Singpass login will no longer be available.{' '}
            Please log in using email OTP instead. If you’re unable to access{' '}
            your email, refer to this{' '}
            <a
              href="https://docs.developer.tech.gov.sg/docs/postman-sgdp-guide/login-on-the-go"
              target="_blank"
              rel="noreferrer"
            >
              guide
            </a>{' '}
            to learn how you can forward the email OTP to your phone number
          </h4>
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
      {!otpSent && (
        <React.Fragment>
          <h4 className={styles.text}>
            <Trans>or</Trans>
          </h4>
          <PrimaryButton onClick={() => openSgidUnavailableModal()}>
            Log in with Singpass
          </PrimaryButton>
          <p>
            Can my agency use this? Check{' '}
            <a
              style={{ textDecoration: 'underline' }}
              href={''}
              target="_blank"
              rel="noreferrer"
            >
              here
            </a>
          </p>
        </React.Fragment>
      )}
    </div>
  )
}

export default Login
