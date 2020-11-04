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
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
  CredLabelInput,
  Checkbox,
  PrimaryInfoBlock,
} from 'components/common'
import SMSValidationInput from './SMSValidationInput'
import TwilioCredentialsInput, {
  TwilioCredentials,
} from './TwilioCredentialsInput'
import styles from '../Create.module.scss'
import { OutboundLink } from 'react-ga'
import { i18n } from 'locales'
import { LINKS } from 'config'

const SMSCredentials = ({
  hasCredential: initialHasCredential,
  isDemo,
  onNext,
  onPrevious,
}: {
  hasCredential: boolean
  isDemo: boolean
  onNext: (changes: any, next?: boolean) => void
  onPrevious: () => void
}) => {
  const DEMO_CREDENTIAL = 'SMS_DEFAULT'
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
        setErrorMessage(e.message)
      }
    }
    const defaultLabels = isDemo ? [DEMO_CREDENTIAL] : []
    populateStoredCredentials(defaultLabels)
  }, [isDemo])

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

  function renderCredentialFields(isEmbedded = false) {
    return (
      <>
        <StepSection>
          {isManual ? (
            <>
              <StepHeader
                title="Insert your Twilio credentials"
                subtitle="Step 3"
              />
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
              <div>
                <TwilioCredentialsInput onFilled={setCreds} />
              </div>
              {storedCredentials.length ? (
                <p className="clickable" onClick={toggleInputMode}>
                  Select from stored credentials
                </p>
              ) : null}
            </>
          ) : (
            <>
              <StepHeader
                title="Select your Twilio credentials"
                subtitle={isEmbedded ? '' : 'Step 3'}
              />
              <Dropdown
                onSelect={setSelectedCredential}
                options={storedCredentials}
                defaultLabel={storedCredentials[0]?.label}
              ></Dropdown>
              <p className="clickable" onClick={() => setIsManual(true)}>
                Input credentials manually
              </p>
              {isDemo && selectedCredential === DEMO_CREDENTIAL && (
                <PrimaryInfoBlock>
                  <h4>Using the default credentials?</h4>
                  <span>
                    In demo mode, you can use Postman&apos;s SMS credentials to
                    try sending SMS messages for free. In a normal campaign,
                    you’d have to add your own credentials by setting up your
                    own Twilio account.{' '}
                    <OutboundLink
                      className={styles.inputLabelHelpLink}
                      eventLabel={i18n._(LINKS.guideSmsUrl)}
                      to={i18n._(LINKS.guideSmsUrl)}
                      target="_blank"
                    >
                      Learn more
                    </OutboundLink>
                  </span>
                </PrimaryInfoBlock>
              )}
            </>
          )}
        </StepSection>

        <StepSection separator={false}>
          <StepHeader title="Validate your credentials by doing a test send">
            <p className={styles.validateCredentialsInfo}>
              To ensure your credentials are working perfectly, please send a
              test SMS to an available phone number to receive a preview of your
              message.
            </p>
          </StepHeader>
          <SMSValidationInput
            onClick={handleValidateCredentials}
            buttonDisabled={
              isManual
                ? !creds || (saveCredentialWithLabel && !label)
                : !selectedCredential
            }
          />
          <ErrorBlock>{errorMessage}</ErrorBlock>
        </StepSection>
      </>
    )
  }

  return (
    <>
      {hasCredential ? (
        <>
          <StepSection>
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
              renderCredentialFields(true)
            ) : (
              <PrimaryButton
                className={cx(styles.darkBlueBtn)}
                onClick={() => setShowCredentialFields(true)}
              >
                Enter new credentials
              </PrimaryButton>
            )}
          </StepSection>

          <ButtonGroup>
            <NextButton disabled={!hasCredential} onClick={onNext} />
            <TextButton onClick={onPrevious}>Previous</TextButton>
          </ButtonGroup>
        </>
      ) : (
        <>{renderCredentialFields()}</>
      )}
    </>
  )
}

export default SMSCredentials
