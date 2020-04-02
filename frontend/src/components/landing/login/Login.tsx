import React, { useState } from 'react'
import { TextInput, PrimaryButton } from 'components/common'
import styles from './Login.module.scss'

const emailText = 'Sign in with your gov.sg email'
const otpText = 'Enter the 6-digit One Time Password sent to your email'
const emailButtonText = 'Get OTP'
const otpButtonText = 'Sign In'

const Login = () => {
  const [otpSent, setOtpSent] = useState(false)

  function onButtonClick() {
    setOtpSent(true)
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.text}>
        {otpSent ? otpText : emailText}
      </h4>
      <div className={styles.inputWithButton}>
        <TextInput className={styles.textInput}></TextInput>
        <PrimaryButton className={styles.inputButton} onClick={onButtonClick}>
          {otpSent ? otpButtonText : emailButtonText}
        </PrimaryButton>
      </div>
    </div>
  )
}

export default Login