import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import cx from 'classnames'

import {
  validateStoredCredentials,
  validateNewCredentials,
  verifyCampaignCredentials,
  getStoredCredentials,
} from 'services/telegram.service'
import { PrimaryButton, ErrorBlock, Dropdown } from 'components/common'
import TelegramCredentialsInput from './TelegramCredentialsInput'
import TelegramValidationInput from './TelegramValidationInput'
import styles from '../Create.module.scss'

const TelegramCredentials = ({
  hasCredential: initialHasCredential,
  onNext,
}: {
  hasCredential: boolean
  onNext: (changes: any, next?: boolean) => void
}) => {
  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [storedCredentials, setStoredCredentials] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedCredential, setSelectedCredential] = useState('')
  const [creds, setCreds] = useState(null as any)
  const [showCredentialFields, setShowCredentialFields] = useState(
    !hasCredential
  )
  const [isManual, setIsManual] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const { id: campaignId } = useParams()

  useEffect(() => {
    populateStoredCredentials()
  }, [])

  async function populateStoredCredentials() {
    try {
      const storedCredLabels = await getStoredCredentials()
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
    setSelectedCredential('')
  }

  async function handleSelectStoredCredentials() {
    setErrorMessage(null)
    setIsValidating(true)

    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      await validateStoredCredentials({
        campaignId: +campaignId,
        label: selectedCredential,
      })

      setHasCredential(true)
      setShowCredentialFields(false)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: true }, false)
    } catch (e) {
      setErrorMessage(e.message)
    }

    setIsValidating(false)
  }

  async function handleNewCredentials() {
    setErrorMessage(null)
    setIsValidating(true)

    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      await validateNewCredentials({
        campaignId: +campaignId,
        ...creds,
      })

      setHasCredential(true)
      setShowCredentialFields(false)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: true }, false)
    } catch (e) {
      setErrorMessage(e.message)
    }

    setIsValidating(false)
  }

  async function handleSendValidationMessage(recipient: string) {
    setErrorMessage(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      await verifyCampaignCredentials({
        campaignId: +campaignId,
        recipient,
      })
    } catch (e) {
      setErrorMessage(e.message)
    }
  }

  function renderCredentialFields() {
    return (
      <>
        <h2>Insert your Telegram credentials</h2>
        <p className={styles.validateCredentialsInfo}>
          Select from your stored credentials or add new ones.
        </p>

        {isManual ? (
          <>
            {storedCredentials.length ? (
              <p className="clickable" onClick={toggleInputMode}>
                Select from stored credentials
              </p>
            ) : null}
            <div className="separator"></div>

            <h2>Add new credentials</h2>
            <p className={styles.validateCredentialsInfo}>
              Before you validate the credentials, the phone number you are
              testing with <b>must be already subscribed to the bot</b>. Learn
              more.
            </p>

            <div className={styles.validateCredentialsInfo}>
              <TelegramCredentialsInput onFilled={setCreds} />
            </div>
            <ErrorBlock>{errorMessage}</ErrorBlock>

            <div className="progress-button">
              <PrimaryButton disabled={!creds} onClick={handleNewCredentials}>
                {isValidating ? (
                  <>
                    Validating<i className="bx bx-loader-alt bx-spin"></i>
                  </>
                ) : (
                  'Validate credentials →'
                )}
              </PrimaryButton>
            </div>
          </>
        ) : (
          <>
            <Dropdown
              onSelect={setSelectedCredential}
              options={storedCredentials}
            ></Dropdown>
            <ErrorBlock>{errorMessage}</ErrorBlock>

            <p className="clickable" onClick={() => setIsManual(true)}>
              Add new credentials
            </p>

            <div className="progress-button">
              <PrimaryButton
                disabled={!selectedCredential}
                onClick={handleSelectStoredCredentials}
              >
                {isValidating ? (
                  <>
                    Validating<i className="bx bx-loader-alt bx-spin"></i>
                  </>
                ) : (
                  'Select credentials →'
                )}
              </PrimaryButton>
            </div>
          </>
        )}
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
            <>
              <PrimaryButton
                className={cx(styles.darkBlueBtn, styles.newCredentialsButton)}
                onClick={() => {
                  setErrorMessage(null)
                  setShowCredentialFields(true)
                }}
              >
                Enter new credentials
              </PrimaryButton>
              <div className="separator"></div>

              <h2>Optional: Send a test message</h2>
              <p className={styles.validateCredentialsInfo}>
                To ensure everything is working perfectly, please send a test
                message to receive a preview of your message. Do note that the
                phone number you are testing with must already be{' '}
                <b>subscribed to the bot</b>.
              </p>
              <TelegramValidationInput onClick={handleSendValidationMessage} />
              <ErrorBlock>{errorMessage}</ErrorBlock>
              <div className="separator"></div>

              <div className="progress-button">
                <PrimaryButton disabled={!hasCredential} onClick={onNext}>
                  Send messages →
                </PrimaryButton>
              </div>
            </>
          )}
        </>
      ) : (
        <>{renderCredentialFields()}</>
      )}
    </>
  )
}

export default TelegramCredentials
