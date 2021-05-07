import { useState, useContext, useEffect } from 'react'

import isEmail from 'validator/lib/isEmail'

import styles from './UpdateCustomFromAddressModal.module.scss'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import FailureImage from 'assets/img/failure.png'
import SuccessImage from 'assets/img/success.png'
import {
  PrimaryButton,
  ErrorBlock,
  NextButton,
  TextInput,
} from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { verifyFromAddress } from 'services/email.service'

enum UpdateFromAddressStep {
  Update,
  Success,
  Failure,
}

const UpdateCustomFromAddressModal = ({
  label,
  onSuccess,
}: {
  label: string
  onSuccess: () => void
}) => {
  const [step, setStep] = useState(UpdateFromAddressStep.Update)
  const [errorMessage, setErrorMessage] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isInvalidDisplayName, setIsInvalidDisplayName] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [fromAddress, setFromAddress] = useState(label)
  const modalContext = useContext(ModalContext)

  function parseFromAddress(
    email: string
  ): { name: string | null; fromAddress: string } {
    // Regex from https://github.com/validatorjs/validator.js/blob/685c3d2edef67d68c27193d28db84d08c0f4534a/src/lib/isEmail.js#L18
    // eslint-disable-next-line no-control-regex
    const address = email.match(/^([^\x00-\x1F\x7F-\x9F\cX]+)<(.+)>$/i) // Matches display name if it exists
    if (address !== null) {
      const [, name, fromAddress] = address
      return { name: name.trim(), fromAddress }
    }
    return { name: null, fromAddress: email }
  }

  function formatFromAddress(
    name: string | null | undefined,
    fromAddress: string
  ): string {
    const from = fromAddress.toLowerCase()
    if (name) return `${name} <${from}>`
    return from
  }

  // On load, prepopulate the display name input box
  useEffect(() => {
    const { name } = parseFromAddress(label)
    setDisplayName(name || '')
  }, [label])

  // Construct email from display name and label
  useEffect(() => {
    const { fromAddress: address } = parseFromAddress(label)
    setFromAddress(formatFromAddress(displayName, address))
  }, [displayName, label])

  async function updateOnClick() {
    setErrorMessage('')
    try {
      await verifyFromAddress(recipient, fromAddress)
      setStep(UpdateFromAddressStep.Success)
      onSuccess()
    } catch (e) {
      console.error(e)
      setErrorMessage(e.message)
      setStep(UpdateFromAddressStep.Failure)
    }
  }

  function isInvalidRecipient() {
    return !isEmail(recipient)
  }

  function isInvalidFromAddress() {
    return !isEmail(fromAddress, { allow_display_name: true })
  }

  function validateDisplayName() {
    setErrorMessage('')
    setIsInvalidDisplayName(false)
    if (!/^[\w\d\s-_]*$/.test(displayName)) {
      setErrorMessage(
        'Name can only contain letters, numbers, spaces, dashes and underscores'
      )
      setIsInvalidDisplayName(true)
    }
  }

  function renderValidate() {
    return (
      <>
        <img src={ConfirmImage} alt="" />
        <h2>Update Name of From Address</h2>
        <p>
          You can change the display name of <b>{label}</b>. Enter a display
          name for the from address, and an available recipient to receive a
          validation message.
        </p>
        <h5>Display name (optional)</h5>
        <TextInput
          placeholder="Enter a name"
          value={displayName}
          onChange={setDisplayName}
          onBlur={validateDisplayName}
        />
        <h5>Email address to receive validation message</h5>
        <TextInput
          placeholder="Enter an email address"
          value={recipient}
          onChange={setRecipient}
        />
        <NextButton
          onClick={updateOnClick}
          disabled={
            isInvalidRecipient() ||
            isInvalidFromAddress() ||
            isInvalidDisplayName
          }
          loadingPlaceholder={
            <>
              Updating<i className="bx bx-loader-alt bx-spin"></i>
            </>
          }
        />
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </>
    )
  }

  function renderUpdateFromAddressStep() {
    switch (step) {
      case UpdateFromAddressStep.Update:
        return renderValidate()
      case UpdateFromAddressStep.Success:
        return (
          <div className={styles.centerAlign}>
            <img src={SuccessImage} alt="" />
            <h3>
              We sent your message from <b>{fromAddress}</b>. Check your inbox
              to see if you received it.
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
      case UpdateFromAddressStep.Failure:
        return (
          <div className={styles.centerAlign}>
            <img src={FailureImage} alt="" />
            <h3>Sorry, something went wrong.</h3>
            <ErrorBlock>{errorMessage}</ErrorBlock>
          </div>
        )
    }
  }

  return <div className={styles.container}>{renderUpdateFromAddressStep()}</div>
}

export default UpdateCustomFromAddressModal
