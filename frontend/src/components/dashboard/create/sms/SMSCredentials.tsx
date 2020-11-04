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
} from 'components/common'
import SMSValidationInput from './SMSValidationInput'
import TwilioCredentialsInput, {
  TwilioCredentials,
} from './TwilioCredentialsInput'
import styles from '../Create.module.scss'

const SMSCredentials = ({
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
  const [creds, setCreds] = useState(null as TwilioCredentials | null)
  const [showCredentialFields, setShowCredentialFields] = useState(
    !hasCredential
  )
  const [isManual, setIsManual] = useState(false)
  const [errorMessazge, setErrorMessage] = useState(null)
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
              ></Dropdown>
              <p className="clickable" onClick={() => setIsManual(true)}>
                Input credentials manually
              </p>
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
            buttonDisabled={isManual ? !creds : !selectedCredential}
          />
          <ErrorBlock>{errorMessazge}</ErrorBlock>
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
