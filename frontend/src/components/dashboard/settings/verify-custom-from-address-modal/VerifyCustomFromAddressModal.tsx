import { useState, useContext } from 'react'

import styles from './VerifyCustomFromAddressModal.module.scss'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import FailureImage from 'assets/img/failure.png'
import SuccessImage from 'assets/img/success.png'
import { PrimaryButton, ErrorBlock } from 'components/common'
import EmailValidationInput from 'components/dashboard/create/email/EmailValidationInput'
import { ModalContext } from 'contexts/modal.context'
import { verifyFromAddress } from 'services/email.service'

enum VerifyEmailStep {
  Verify,
  Success,
  Failure,
}

const VerifyCustomFromAddressModal = ({
  label,
  onSuccess,
}: {
  label: string
  onSuccess: () => void
}) => {
  const [step, setStep] = useState(VerifyEmailStep.Verify)
  const [errorMessage, setErrorMessage] = useState('')
  const modalContext = useContext(ModalContext)

  async function verifyOnClick(recipient: string) {
    setErrorMessage('')
    try {
      await verifyFromAddress(recipient, label)
      setStep(VerifyEmailStep.Success)
      onSuccess()
    } catch (e) {
      console.error(e)
      setErrorMessage((e as Error).message)
      setStep(VerifyEmailStep.Failure)
    }
  }

  function renderValidate() {
    return (
      <>
        <img src={ConfirmImage} alt="" />
        <h2>Verify From Address</h2>
        <p>
          To verify that emails can be sent from <b>{label}</b>, please enter an
          available recipient to receive a validation message.
        </p>
        {<EmailValidationInput onClick={verifyOnClick}></EmailValidationInput>}
      </>
    )
  }

  function renderVerifyCredStep() {
    switch (step) {
      case VerifyEmailStep.Verify:
        return renderValidate()
      case VerifyEmailStep.Success:
        return (
          <div className={styles.centerAlign}>
            <img src={SuccessImage} alt="" />
            <h3>
              We sent your message from <b>{label}</b>. Check your inbox to see
              if you received it.
            </h3>
            <PrimaryButton
              className={styles.padTop}
              onClick={() => modalContext.close()}
            >
              Done
            </PrimaryButton>
          </div>
        )
      // Credentials failed to store
      case VerifyEmailStep.Failure:
        return (
          <div className={styles.centerAlign}>
            <img src={FailureImage} alt="" />
            <h3>Sorry, something went wrong.</h3>
            <ErrorBlock>{errorMessage}</ErrorBlock>
          </div>
        )
    }
  }

  return <div className={styles.container}>{renderVerifyCredStep()}</div>
}

export default VerifyCustomFromAddressModal
