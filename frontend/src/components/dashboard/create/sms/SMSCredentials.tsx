import React, { useState } from 'react'

import { validateCredentials } from 'services/sms.service'
import { TextInput, PrimaryButton, TextInputWithButton } from 'components/common'
import styles from '../Create.module.scss'

const SMSCredentials = ({ hasCredentials: initialHasCredentials, onNext }: { hasCredentials: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredentials, setHasCredentials] = useState(initialHasCredentials)
  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [showCredentialFields, setShowCredentialFields] = useState(!hasCredentials)

  function isDisabled() {
    return !accountSid || !apiKey || !apiSecret || !messagingServiceSid || !(/^\d+$/g).test(mobileNumber)
  }

  function resetFields() {
    setAccountSid('')
    setApiKey('')
    setApiSecret('')
    setMessagingServiceSid('')
    setMobileNumber('')
  }

  async function handleValidateCredentials() {
    const isValid = await validateCredentials(accountSid, apiKey, apiSecret, messagingServiceSid, mobileNumber)
    setHasCredentials(isValid)
    setShowCredentialFields(false)
    resetFields()
  }

  function renderCredentialFields() {
    return (
      <>
        <h5>Account SID</h5>
        <TextInput
          placeholder="Enter Account SID"
          value={accountSid}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountSid(e.target.value)}
        />

        <h5>API Key</h5>
        <TextInput
          placeholder="Enter API Key"
          value={apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
        />

        <h5>API Secret</h5>
        <TextInput
          placeholder="Enter API Secret"
          value={apiSecret}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiSecret(e.target.value)}
        />

        <h5>Messaging Service ID</h5>
        <TextInput
          placeholder="Enter Messaging Service ID"
          value={messagingServiceSid}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessagingServiceSid(e.target.value)}
        />

        <div className="separator"></div>

        <h2>Validate your credentials by doing a test send</h2>
        <p>
          To ensure your credentials are working perfectly,
          please send a test SMS to an available phone numnber
          to receive a preview of your message.
        </p>
        <TextInputWithButton
          type="tel"
          value={mobileNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobileNumber(e.target.value)}
          onClick={handleValidateCredentials}
          disabled={isDisabled()}
        >
          Validate credential
        </TextInputWithButton>
      </>
    )
  }

  return (
    <>
      <sub>Step 3</sub>
      {
        hasCredentials
          ? (
            <>
              <h2>Your current credentials have already been validated.</h2>
              <p>
                Entering new credentials will overwrite the previous validated one.
                This action is irreversible. Please proceed with caution.
              </p>
              {
                showCredentialFields
                  ? renderCredentialFields()
                  : (
                    <PrimaryButton className={styles.darkBlueBtn} onClick={() => setShowCredentialFields(true)}>
                  Enter new credentials
                    </PrimaryButton>
                  )
              }

              <div className="separator"></div>

              <div className="progress-button">
                <PrimaryButton disabled={!hasCredentials} onClick={onNext}>Send Message →</PrimaryButton>
              </div>
            </>
          )
          : (
            <>
              <h2>Insert your SMS credentials</h2>
              { renderCredentialFields() }
            </>
          )
      }
    </>
  )
}

export default SMSCredentials
