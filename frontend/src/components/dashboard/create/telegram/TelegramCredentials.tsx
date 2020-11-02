import React, { useState, useEffect } from 'react'
import { OutboundLink } from 'react-ga'
import { useParams } from 'react-router-dom'
import cx from 'classnames'

import { LINKS } from 'config'
import {
  validateStoredCredentials,
  validateNewCredentials,
  verifyCampaignCredentials,
  getStoredCredentials,
} from 'services/telegram.service'
import {
  PrimaryButton,
  NextButton,
  InfoBlock,
  ErrorBlock,
  Dropdown,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
} from 'components/common'
import TelegramCredentialsInput from './TelegramCredentialsInput'
import TelegramValidationInput from './TelegramValidationInput'
import styles from '../Create.module.scss'
import { i18n } from 'locales'

const TelegramCredentials = ({
  hasCredential: initialHasCredential,
  onNext,
  onPrevious,
}: {
  hasCredential: boolean
  onNext: (changes: any, next?: boolean) => void
  onPrevious: () => void
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
  const [sendSuccess, setSendSuccess] = useState(false)
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

  function toggleReplaceCredentials() {
    setErrorMessage(null)
    setSendSuccess(false)
    setShowCredentialFields(true)
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
    setSendSuccess(false)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      await verifyCampaignCredentials({
        campaignId: +campaignId,
        recipient,
      })
      setSendSuccess(true)
    } catch (e) {
      setErrorMessage(e.message)
    }
  }

  function renderCredentialFields(isEmbedded = false) {
    return (
      <>
        <StepHeader
          title="Insert your Telegram credentials"
          subtitle={isEmbedded ? '' : 'Step 3'}
        >
          <p className={styles.validateCredentialsInfo}>
            Select from your stored credentials or add new ones.
          </p>
        </StepHeader>

        {isManual ? (
          <>
            {storedCredentials.length ? (
              <StepSection>
                <p className="clickable" onClick={toggleInputMode}>
                  Select from stored credentials
                </p>
              </StepSection>
            ) : null}

            <StepSection>
              <StepHeader title="Add new credentials">
                <p className={styles.validateCredentialsInfo}>
                  Please provide your Telegram bot token for validation. If you
                  are unsure about how to retrieve your bot token, please follow
                  the instructions provided&nbsp;
                  <OutboundLink
                    eventLabel={i18n._(LINKS.guideTelegramUrl)}
                    to={i18n._(LINKS.guideTelegramUrl)}
                    target="_blank"
                  >
                    here.
                  </OutboundLink>
                </p>
              </StepHeader>

              <div className={styles.validateCredentialsInfo}>
                <TelegramCredentialsInput onFilled={setCreds} />
              </div>
              <ErrorBlock>{errorMessage}</ErrorBlock>
            </StepSection>

            <ButtonGroup>
              <PrimaryButton disabled={!creds} onClick={handleNewCredentials}>
                {isValidating ? (
                  <>
                    Validating<i className="bx bx-loader-alt bx-spin"></i>
                  </>
                ) : (
                  <>
                    Validate credentials{' '}
                    <i className="bx bx-right-arrow-alt"></i>
                  </>
                )}
              </PrimaryButton>
              <TextButton onClick={onPrevious}>Previous</TextButton>
            </ButtonGroup>
          </>
        ) : (
          <>
            <StepSection>
              <Dropdown
                onSelect={setSelectedCredential}
                options={storedCredentials}
              ></Dropdown>
              <ErrorBlock>{errorMessage}</ErrorBlock>

              <p className="clickable" onClick={() => setIsManual(true)}>
                Add new credentials
              </p>
            </StepSection>

            <ButtonGroup>
              <PrimaryButton
                disabled={!selectedCredential}
                onClick={handleSelectStoredCredentials}
              >
                {isValidating ? (
                  <>
                    Validating<i className="bx bx-loader-alt bx-spin"></i>
                  </>
                ) : (
                  <>
                    Select credentials <i className="bx bx-right-arrow-alt"></i>
                  </>
                )}
              </PrimaryButton>
              <TextButton onClick={onPrevious}>Previous</TextButton>
            </ButtonGroup>
          </>
        )}
      </>
    )
  }

  return (
    <>
      {hasCredential ? (
        <>
          <StepHeader
            title="Your current credentials have already been validated."
            subtitle="Step 3"
          >
            <p>
              Entering new credentials will overwrite the previous validated
              one. This action is irreversible. Please proceed with caution.
            </p>
          </StepHeader>
          {showCredentialFields ? (
            <>
              <div className="separator"></div>
              {renderCredentialFields(true)}
            </>
          ) : (
            <>
              <StepSection>
                <PrimaryButton
                  className={cx(styles.darkBlueBtn)}
                  onClick={toggleReplaceCredentials}
                >
                  Enter new credentials
                </PrimaryButton>
              </StepSection>

              <StepSection>
                <StepHeader title="Optional: Send a test message">
                  <p className={styles.validateCredentialsInfo}>
                    To ensure everything is working perfectly, please send a
                    test message to receive a preview of your message. Do note
                    that the phone number you are testing with must already be{' '}
                    <b>subscribed to the bot</b>.
                  </p>
                </StepHeader>
                <TelegramValidationInput
                  onClick={handleSendValidationMessage}
                />
                {sendSuccess && (
                  <InfoBlock>
                    <li>
                      <i className="bx bx-check-circle"></i>
                      <span>Message sent successfully.</span>
                    </li>
                  </InfoBlock>
                )}
                <ErrorBlock>{errorMessage}</ErrorBlock>
              </StepSection>

              <ButtonGroup>
                <NextButton disabled={!hasCredential} onClick={onNext} />
                <TextButton onClick={onPrevious}>Previous</TextButton>
              </ButtonGroup>
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
