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
  getSgidUrl,
} from 'services/auth.service'

import {
  GA_USER_EVENTS,
  sendUserEvent,
  sendException,
} from 'services/ga.service'

const RESEND_WAIT_TIME = 30000
const SGID_VALID_ORGANISATIONS_PAGE =
  'https://docs.id.gov.sg/faq-users#as-a-government-officer-why-am-i-not-able-to-login-to-my-work-tool-using-sgid'

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
  const modalContext = useContext(ModalContext)
  let timeoutId: NodeJS.Timeout

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId)
  })

  const SINGPASS_ERROR_CODE = 'SingpassError'
  const NO_EMPLOYEE_PROFILE_ERROR_CODE = 'NoSingpassProfile'

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const errorCode = params.get('errorCode')
    const openNoEmployeeProfileModal = () =>
      modalContext.setModalContent(
        <ConfirmModal
          title={`Oops, we don't have your employee profile in the system`}
          subtitleElement={
            <h4 className={styles.subtitleElement}>
              Please check{' '}
              <a
                style={{ textDecoration: 'underline' }}
                href={SGID_VALID_ORGANISATIONS_PAGE}
              >
                here
              </a>{' '}
              if your government agency is supported. Meanwhile, login via your
              email instead.
            </h4>
          }
          buttonText="Use Email Login"
          alternateImage={ErrorImage}
          primary={true}
          onConfirm={() => modalContext.close()}
        />
      )

    const openSingpassErrorModal = () =>
      modalContext.setModalContent(
        <ConfirmModal
          title={`An error occured while trying to log in via Singpass`}
          buttonText="Use Email Login"
          alternateImage={ErrorImage}
          primary={true}
          onConfirm={() => modalContext.close()}
        />
      )
    switch (errorCode) {
      case SINGPASS_ERROR_CODE:
        void openSingpassErrorModal()
        break
      case NO_EMPLOYEE_PROFILE_ERROR_CODE:
        void openNoEmployeeProfileModal()
        break
      default:
        break
    }
  }, [])

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
      {/* This feature is experimental and should only be rendered on the demo URL (/sgid-login) */}
      {!otpSent && (
        <React.Fragment>
          <h4 className={styles.text}>
            <Trans>or</Trans>
          </h4>
          <PrimaryButton onClick={sgidLogin}>
            Log in with Singpass
          </PrimaryButton>
          <p>
            Can my agency use this? Check{' '}
            <a
              style={{ textDecoration: 'underline' }}
              href={SGID_VALID_ORGANISATIONS_PAGE}
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
