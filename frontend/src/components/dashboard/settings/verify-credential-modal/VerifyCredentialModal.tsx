import React, { useState, useContext } from 'react'

import { ChannelType } from 'classes'
import { PrimaryButton, ErrorBlock } from 'components/common'
import SMSValidationInput from 'components/dashboard/create/sms/SMSValidationInput'
import EmailValidationInput from 'components/dashboard/create/email/EmailValidationInput'
import { ModalContext } from 'contexts/modal.context'
import { verifyUserCredentials as VerifyUserSmsCredentials } from 'services/sms.service'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import FailureImage from 'assets/img/failure.png'
import SuccessImage from 'assets/img/success.png'
import styles from './VerifyCredentialModal.module.scss'

enum VerifyCredentialStep {
  Verify,
  Success,
  Failure,
}

const VerifyCredentialModal = ({
  label,
  credType,
}: {
  label: string
  credType: ChannelType
}) => {
  const [credStep, setCredStep] = useState(VerifyCredentialStep.Verify)
  const [errorMessage, setErrorMessage] = useState('')
  const modalContext = useContext(ModalContext)

  async function verifyCredential(recipient: string) {
    setErrorMessage('')
    try {
      switch (credType) {
        case ChannelType.SMS:
          await VerifyUserSmsCredentials({ recipient, label })
          break
        case ChannelType.Email:
          throw new Error('not implemented')
      }
      setCredStep(VerifyCredentialStep.Success)
    } catch (e) {
      console.error(e)
      setErrorMessage(e.message)
      setCredStep(VerifyCredentialStep.Failure)
    }
  }

  function renderValidate() {
    let validateInput
    switch (credType) {
      case ChannelType.SMS:
        validateInput = (
          <SMSValidationInput onClick={verifyCredential}></SMSValidationInput>
        )
        break
      case ChannelType.Email:
        validateInput = (
          <EmailValidationInput
            onClick={verifyCredential}
          ></EmailValidationInput>
        )
        break
    }

    return (
      <>
        <img src={ConfirmImage}></img>
        <h2>Verify {label} credentials</h2>
        <p>
          To verify that your credentials are still working perfectly, please
          enter an available recipient to receive a validation message.
        </p>
        {validateInput}
      </>
    )
  }

  function renderVerifyCredStep() {
    switch (credStep) {
      // Verify credential step
      case VerifyCredentialStep.Verify:
        return renderValidate()
      // Credential verification succeeded
      case VerifyCredentialStep.Success:
        return (
          <div className={styles.centerAlign}>
            <img src={SuccessImage} />
            <h3>Your credentials are working well.</h3>
            <PrimaryButton
              className={styles.padTop}
              onClick={() => modalContext.setModalContent(null)}
            >
              Done
            </PrimaryButton>
          </div>
        )
      // Credentials failed to store
      case VerifyCredentialStep.Failure:
        return (
          <div className={styles.centerAlign}>
            <img src={FailureImage} />
            <h3>Sorry, something went wrong.</h3>
            <ErrorBlock>{errorMessage}</ErrorBlock>
          </div>
        )
    }
  }

  return <div className={styles.container}>{renderVerifyCredStep()}</div>
}

export default VerifyCredentialModal
