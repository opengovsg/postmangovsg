import React, {
  useState,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { OutboundLink } from 'react-ga'
import { useParams } from 'react-router-dom'
import cx from 'classnames'

import { CampaignContext } from 'contexts/campaign.context'
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
} from 'components/common'
import TelegramCredentialsInput from './TelegramCredentialsInput'
import TelegramValidationInput from './TelegramValidationInput'
import styles from '../Create.module.scss'
import { i18n } from 'locales'
import { TelegramCampaign, TelegramProgress } from 'classes'

const TelegramCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<TelegramProgress>>
}) => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { hasCredential: initialHasCredential } = campaign
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

  async function handleValidateCredentials() {
    setErrorMessage(null)
    setIsValidating(true)

    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      if (isManual && creds) {
        await validateNewCredentials({
          campaignId: +campaignId,
          ...creds,
        })
      } else if (!isManual && selectedCredential) {
        await validateStoredCredentials({
          campaignId: +campaignId,
          label: selectedCredential,
        })
      } else {
        throw new Error('Missing credentials')
      }

      setHasCredential(true)
      setShowCredentialFields(false)
      // Saves hasCredential property but do not advance to next step
      setCampaign(
        (campaign) => ({ ...campaign, hasCredential: true } as TelegramCampaign)
      )
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
              Please provide your Telegram bot token for validation. If you are
              unsure about how to retrieve your bot token, please follow the
              instructions provided&nbsp;
              <OutboundLink
                eventLabel={i18n._(LINKS.guideTelegramUrl)}
                to={i18n._(LINKS.guideTelegramUrl)}
                target="_blank"
              >
                here.
              </OutboundLink>
            </p>

            <div className={styles.validateCredentialsInfo}>
              <TelegramCredentialsInput onFilled={setCreds} />
            </div>
            <ErrorBlock>{errorMessage}</ErrorBlock>

            <div className="progress-button">
              <PrimaryButton
                disabled={!creds}
                onClick={handleValidateCredentials}
              >
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
                onClick={handleValidateCredentials}
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
                onClick={toggleReplaceCredentials}
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
              {sendSuccess && (
                <InfoBlock>
                  <li>
                    <i className="bx bx-check-circle"></i>
                    <span>Message sent successfully.</span>
                  </li>
                </InfoBlock>
              )}
              <ErrorBlock>{errorMessage}</ErrorBlock>
              <div className="separator"></div>

              <NextButton
                disabled={!hasCredential}
                onClick={() => setActiveStep((s) => s + 1)}
              />
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
