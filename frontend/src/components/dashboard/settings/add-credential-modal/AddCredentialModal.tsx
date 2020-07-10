import React, { useState, useContext } from 'react'

import { ChannelType } from 'classes'
import { PrimaryButton, ErrorBlock, CredLabelInput } from 'components/common'
import TwilioCredentialsInput from 'components/dashboard/create/sms/TwilioCredentialsInput'
import SMSValidationInput from 'components/dashboard/create/sms/SMSValidationInput'
import EmailValidationInput from 'components/dashboard/create/email/EmailValidationInput'
import { ModalContext } from 'contexts/modal.context'
import { storeCredentials as storeSmsCredentials } from 'services/sms.service'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import FailureImage from 'assets/img/failure.png'
import SuccessImage from 'assets/img/success.png'
import styles from './AddCredentialModal.module.scss'

enum AddCredentialStep {
  SelectType,
  Input,
  Validate,
  Success,
  Failure,
}

const AddCredentialModal = ({
  labels,
  onSuccess,
}: {
  labels: string[]
  onSuccess: Function
}) => {
  // Using channel type as proxy for credential type for now
  // Hardcode to add new twilio cred
  const [label, setLabel] = useState('')
  const [credType, setCredType] = useState(ChannelType.SMS)
  const [credStep, setCredStep] = useState(AddCredentialStep.Input)
  const [credentials, setCredentials] = useState(null as any)
  const [errorMessage, setErrorMessage] = useState('')
  const modalContext = useContext(ModalContext)

  function isValidLabel() {
    return label && !labels.includes(label)
  }

  // Render credential input based on selected type of credential
  function renderCredentialInput() {
    let credInput = (
      <>
        <CredLabelInput value={label} onChange={setLabel}></CredLabelInput>
        {label && !isValidLabel() && (
          <ErrorBlock>
            Label already exists. Please use a different one.
          </ErrorBlock>
        )}
      </>
    )
    switch (credType) {
      case ChannelType.SMS:
        credInput = (
          <>
            <h2>Add new Twilio credentials</h2>
            {credInput}
            <TwilioCredentialsInput
              onFilled={setCredentials}
            ></TwilioCredentialsInput>
          </>
        )
        break
      case ChannelType.Email:
        credInput = <div>Not available</div>
        break
    }
    return (
      <>
        {credInput}
        <div className="separator"></div>
        <div className="progress-button">
          <PrimaryButton
            disabled={!isValidLabel() || !credentials}
            onClick={() => setCredStep(AddCredentialStep.Validate)}
          >
            Next →
          </PrimaryButton>
        </div>
      </>
    )
  }

  // Validate credential call
  async function validateCredential(recipient: string) {
    setErrorMessage('')
    try {
      switch (credType) {
        case ChannelType.SMS:
          await storeSmsCredentials({ label, ...credentials, recipient })
          break
        case ChannelType.Email:
          throw new Error('not implemented')
      }
      setCredStep(AddCredentialStep.Success)
      onSuccess()
    } catch (e) {
      console.error(e)
      setErrorMessage(e.message)
      setCredStep(AddCredentialStep.Failure)
    }
  }

  // Render validation input based on selected type of credentials
  function renderValidate() {
    let validateInput
    switch (credType) {
      case ChannelType.SMS:
        validateInput = (
          <SMSValidationInput onClick={validateCredential}></SMSValidationInput>
        )
        break
      case ChannelType.Email:
        validateInput = (
          <EmailValidationInput
            onClick={validateCredential}
          ></EmailValidationInput>
        )
        break
    }
    return (
      <>
        <img src={ConfirmImage} alt="" />
        <h2>Almost there, validate credentials to finish</h2>
        <p>
          To ensure your credentials are working perfectly, please enter an
          available mobile number to receive a validation message.
        </p>
        {validateInput}
      </>
    )
  }

  function renderAddCredStep() {
    switch (credStep) {
      // Credential type select step
      case AddCredentialStep.SelectType:
        return (
          <>
            <button onClick={() => setCredType(ChannelType.SMS)}>sms</button>
            <button onClick={() => setCredType(ChannelType.Email)}>sms</button>
          </>
        )
      // Input credentials step
      case AddCredentialStep.Input:
        return renderCredentialInput()
      // Validate credentials step
      case AddCredentialStep.Validate:
        return renderValidate()
      // Credentials stored successuly
      case AddCredentialStep.Success:
        return (
          <div className={styles.centerAlign}>
            <img src={SuccessImage} alt="" />
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
      case AddCredentialStep.Failure:
        return (
          <div className={styles.centerAlign}>
            <img src={FailureImage} alt="" />
            <h3>Sorry, something went wrong.</h3>
            <ErrorBlock>{errorMessage}</ErrorBlock>
            <PrimaryButton onClick={() => setCredStep(AddCredentialStep.Input)}>
              Edit credentials
              <i className="bx bx-edit"></i>
            </PrimaryButton>
          </div>
        )
    }
  }

  return <div className={styles.container}>{renderAddCredStep()}</div>
}

export default AddCredentialModal
