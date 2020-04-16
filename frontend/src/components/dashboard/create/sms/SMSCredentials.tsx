import React, { useState } from 'react'

import { validateCredentials } from 'services/sms.service'
import { TextInput, PrimaryButton, TextInputWithButton } from 'components/common'

const SMSCredentials = ({ hasCredentials: initialHasCredentials, onNext }: { hasCredentials: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredentials, setHasCredentials] = useState(initialHasCredentials)
  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  function isDisabled() {
    return !accountSid || !apiKey || !apiSecret || !messagingServiceSid
  }

  async function handleValidateCredentials() {
    const isValid = await validateCredentials(accountSid, apiKey, apiSecret, messagingServiceSid, mobileNumber)
    setHasCredentials(isValid)
  }

  return (
    <>
      <sub>Step 3</sub>
      {
        hasCredentials
          ? <h2>Your credentials have been validated successfully!</h2>
          : (
            <>
              <h2>Insert your SMS credentials</h2>

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

      <div className="separator"></div>

      <div className="progress-button">
        <PrimaryButton disabled={!hasCredentials} onClick={onNext}>Send Message →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSCredentials
