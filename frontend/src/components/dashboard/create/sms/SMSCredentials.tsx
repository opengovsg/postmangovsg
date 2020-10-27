import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import cx from 'classnames'

import {
  validateStoredCredentials,
  validateNewCredentials,
  getStoredCredentials,
} from 'services/sms.service'
import {
  PrimaryButton,
  NextButton,
  ErrorBlock,
  Dropdown,
  CredLabelInput,
  Checkbox,
} from 'components/common'
import SMSValidationInput from './SMSValidationInput'
import TwilioCredentialsInput, {
  TwilioCredentials,
} from './TwilioCredentialsInput'
import styles from '../Create.module.scss'

const SMSCredentials = ({
  hasCredential: initialHasCredential,
  onNext,
}: {
  hasCredential: boolean
  onNext: (changes: any, next?: boolean) => void
}) => {
  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [credLabels, setCredLabels] = useState([] as string[])
  const [storedCredentials, setStoredCredentials] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedCredential, setSelectedCredential] = useState('')
  const [creds, setCreds] = useState(null as TwilioCredentials | null)
  const [label, setLabel] = useState('')
  const [saveCredentialWithLabel, setSaveCredentialWithLabel] = useState(false)
  const [showCredentialFields, setShowCredentialFields] = useState(
    !hasCredential
  )
  const [isManual, setIsManual] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const { id: campaignId } = useParams()

  useEffect(() => {
    populateStoredCredentials()
  }, [])

  async function populateStoredCredentials() {
    try {
      const storedCredLabels = await getStoredCredentials()
      setCredLabels(storedCredLabels)
      setStoredCredentials(
        storedCredLabels.map((c) => ({ label: c, value: c }))
      )
      if (!storedCredLabels.length) {
        setIsManual(true)
      }
    } catch (e) {
      console.error(e)
      setErrorMessage(e.message)
    }
  }

  function toggleInputMode() {
    setIsManual((m) => !m)
    setCreds(null)
    setLabel('')
    setSaveCredentialWithLabel(false)
    setSelectedCredential('')
  }

  async function handleValidateCredentials(recipient: string) {
    setErrorMessage(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      if (isManual && creds) {
        await validateNewCredentials({
          campaignId: +campaignId,
          ...creds,
          recipient,
          ...(saveCredentialWithLabel && { label }),
        })
      } else if (!isManual && selectedCredential) {
        await validateStoredCredentials({
          campaignId: +campaignId,
          label: selectedCredential,
          recipient,
        })
      } else {
        throw new Error('Missing credentials')
      }
      setHasCredential(true)
      setShowCredentialFields(false)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: true }, false)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  function renderCredentialFields() {
    return (
      <>
        {isManual ? (
          <>
            <h2>Insert your Twilio credentials</h2>
            <CredLabelInput
              className={{
                [styles.credentialLabelInputError]:
                  saveCredentialWithLabel && !label,
              }}
              value={label}
              onChange={setLabel}
              labels={credLabels}
            />
            {saveCredentialWithLabel && !label && (
              <span className={styles.credentialLabelError}>
                Please enter a credential name
              </span>
            )}
            <Checkbox
              checked={saveCredentialWithLabel}
              onChange={setSaveCredentialWithLabel}
            >
              Save this credential for future use. If unchecked, nothing is
              saved.
            </Checkbox>
            <TwilioCredentialsInput
              onFilled={setCreds}
            ></TwilioCredentialsInput>
            {storedCredentials.length ? (
              <p className="clickable" onClick={toggleInputMode}>
                Select from stored credentials
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2>Select your Twilio credentials</h2>
            <Dropdown
              onSelect={setSelectedCredential}
              options={storedCredentials}
            ></Dropdown>
            <p className="clickable" onClick={() => setIsManual(true)}>
              Input credentials manually
            </p>
          </>
        )}
        <div className="separator"></div>

        <h2>Validate your credentials by doing a test send</h2>
        <p className={styles.validateCredentialsInfo}>
          To ensure your credentials are working perfectly, please send a test
          SMS to an available phone number to receive a preview of your message.
        </p>
        <SMSValidationInput
          onClick={handleValidateCredentials}
          buttonDisabled={
            isManual
              ? !creds || (saveCredentialWithLabel && !label)
              : !selectedCredential
          }
        />
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </>
    )
  }

  return (
    <>
      <sub>Step 3</sub>
      {hasCredential ? (
        <>
          <h2>Your current credentials have already been validated.</h2>
          <p>
            Entering new credentials will overwrite the previous validated one.
            This action is irreversible. Please proceed with caution.
          </p>
          {showCredentialFields ? (
            renderCredentialFields()
          ) : (
            <PrimaryButton
              className={cx(styles.darkBlueBtn, styles.newCredentialsButton)}
              onClick={() => setShowCredentialFields(true)}
            >
              Enter new credentials
            </PrimaryButton>
          )}

          <div className="separator"></div>

          <NextButton disabled={!hasCredential} onClick={onNext} />
        </>
      ) : (
        <>{renderCredentialFields()}</>
      )}
    </>
  )
}

export default SMSCredentials
