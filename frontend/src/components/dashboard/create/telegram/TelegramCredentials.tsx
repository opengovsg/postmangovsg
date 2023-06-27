import { i18n } from '@lingui/core'

import cx from 'classnames'

import { useState, useEffect, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { OutboundLink } from 'react-ga'
import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import TelegramCredentialsInput from './TelegramCredentialsInput'
import TelegramValidationInput from './TelegramValidationInput'

import type { TelegramCampaign, TelegramProgress } from 'classes'
import {
  PrimaryButton,
  NextButton,
  DetailBlock,
  ErrorBlock,
  Dropdown,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
  CredLabelInput,
  Checkbox,
  InfoBlock,
} from 'components/common'
import { LINKS } from 'config'
import { CampaignContext } from 'contexts/campaign.context'
import {
  validateStoredCredentials,
  validateNewCredentials,
  verifyCampaignCredentials,
  getStoredCredentials,
} from 'services/telegram.service'

const TelegramCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<TelegramProgress>>
}) => {
  const DEMO_CREDENTIAL = 'Postman_Telegram_Demo'
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { hasCredential: initialHasCredential, demoMessageLimit } =
    campaign as TelegramCampaign
  const isDemo = !!demoMessageLimit

  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [credLabels, setCredLabels] = useState([] as string[])
  const [storedCredentials, setStoredCredentials] = useState(
    [] as { label: string; value: string }[]
  )
  const [selectedCredential, setSelectedCredential] = useState('')
  const [creds, setCreds] = useState(null as any)
  const [label, setLabel] = useState('')
  const [saveCredentialWithLabel, setSaveCredentialWithLabel] = useState(false)
  const [showCredentialFields, setShowCredentialFields] = useState(
    !hasCredential
  )
  const [isManual, setIsManual] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const { id: campaignId } = useParams<{ id: string }>()

  useEffect(() => {
    async function populateStoredCredentials(defaultLabels: string[]) {
      try {
        const labels = await getStoredCredentials()
        const allLabels = defaultLabels.concat(labels)
        setCredLabels(allLabels)
        setStoredCredentials(allLabels.map((c) => ({ label: c, value: c })))
        if (!allLabels.length) {
          setIsManual(true)
        }
      } catch (e) {
        console.error(e)
        setErrorMessage((e as Error).message)
      }
    }
    const defaultLabels = isDemo ? [DEMO_CREDENTIAL] : []
    void populateStoredCredentials(defaultLabels)
  }, [isDemo])

  function toggleInputMode() {
    setIsManual((m) => !m)
    setCreds(null)
    setLabel('')
    setSaveCredentialWithLabel(false)
    setSelectedCredential('')
  }

  function toggleReplaceCredentials() {
    setErrorMessage('')
    setSendSuccess(false)
    setShowCredentialFields(true)
  }

  async function handleValidateCredentials() {
    setErrorMessage('')
    setIsValidating(true)

    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }

      if (isManual && creds) {
        await validateNewCredentials({
          campaignId: +campaignId,
          ...creds,
          ...(saveCredentialWithLabel && { label }),
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
      updateCampaign({ hasCredential: true })
    } catch (e) {
      setErrorMessage((e as Error).message)
    }

    setIsValidating(false)
  }

  async function handleSendValidationMessage(recipient: string) {
    setErrorMessage('')
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
      setErrorMessage((e as Error).message)
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
                <TextButton
                  className={styles.credentialInputButton}
                  onClick={toggleInputMode}
                >
                  Select from stored credentials
                </TextButton>
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

              <div>
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
              </div>
              <div className={styles.validateCredentialsInfo}>
                <TelegramCredentialsInput onFilled={setCreds} />
              </div>
              <ErrorBlock>{errorMessage}</ErrorBlock>
            </StepSection>

            <ButtonGroup>
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
              <TextButton onClick={() => setActiveStep((s) => s - 1)}>
                Previous
              </TextButton>
            </ButtonGroup>
          </>
        ) : (
          <>
            <StepSection>
              <Dropdown
                onSelect={setSelectedCredential}
                options={storedCredentials}
                defaultLabel={storedCredentials[0]?.label}
                disabled={isDemo}
                aria-label="Telegram credentials"
              ></Dropdown>

              <ErrorBlock>{errorMessage}</ErrorBlock>

              <TextButton
                className={styles.credentialInputButton}
                disabled={isDemo}
                onClick={() => !isDemo && setIsManual(true)}
              >
                Add new credentials
              </TextButton>

              {isDemo && selectedCredential === DEMO_CREDENTIAL && (
                <InfoBlock title="Use demo credentials">
                  <p>
                    In demo mode, you can use Postman&apos;s default Telegram
                    bot to try sending Telegram messages. In a normal campaign,
                    you’d have to set up your own Telegram bot.{' '}
                    <OutboundLink
                      className={styles.inputLabelHelpLink}
                      eventLabel={i18n._(LINKS.guideTelegramUrl)}
                      to={i18n._(LINKS.guideTelegramUrl)}
                      target="_blank"
                    >
                      Learn more
                    </OutboundLink>
                  </p>
                  <p>
                    Make sure that you and your recipients are{' '}
                    <b>
                      subscribed to{' '}
                      <OutboundLink
                        className={styles.inputLabelHelpLink}
                        eventLabel={i18n._(LINKS.demoTelegramBotUrl)}
                        to={i18n._(LINKS.demoTelegramBotUrl)}
                        target="_blank"
                      >
                        @postmangovsgbot
                      </OutboundLink>
                    </b>{' '}
                    before proceeding. Unsubscribed recipients will not receive
                    your message.
                  </p>
                </InfoBlock>
              )}
            </StepSection>

            <ButtonGroup>
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
                    Validate credentials{' '}
                    <i className="bx bx-right-arrow-alt"></i>
                  </>
                )}
              </PrimaryButton>
              <TextButton onClick={() => setActiveStep((s) => s - 1)}>
                Previous
              </TextButton>
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
                    <label htmlFor="validateTelegram">
                      To ensure everything is working perfectly, please send a
                      test message to receive a preview of your message. Do note
                      that the phone number you are testing with must already be{' '}
                      <b>subscribed to the bot</b>.
                    </label>
                  </p>
                </StepHeader>
                <div>
                  <TelegramValidationInput
                    onClick={handleSendValidationMessage}
                  />
                </div>
                {sendSuccess && (
                  <DetailBlock>
                    <li>
                      <i className="bx bx-check-circle"></i>
                      <span>Message sent successfully.</span>
                    </li>
                  </DetailBlock>
                )}
                <ErrorBlock>{errorMessage}</ErrorBlock>
              </StepSection>
              <ButtonGroup>
                <NextButton
                  disabled={!hasCredential}
                  onClick={() => setActiveStep((s) => s + 1)}
                />
                <TextButton onClick={() => setActiveStep((s) => s - 1)}>
                  Previous
                </TextButton>
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
