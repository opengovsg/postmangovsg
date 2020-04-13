import React, { useState } from 'react'

import { testCredentials } from 'services/sms.service'
import { TextInput, PrimaryButton, TextInputWithButton } from 'components/common'

const SMSCredentials = ({ hasCredentials, onNext }: { hasCredentials: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  function isDisabled() {
    return !accountSid || !apiKey || !apiSecret || !messagingServiceSid
  }

  return (
    <>
      <sub>Step 3</sub>
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

      <h2>We encourage you to do a test send</h2>
      <p>To ensure your credentials are working perfectly, you may send a test SMS to double check for accuracy.</p>
      <TextInputWithButton
        type="tel"
        value={mobileNumber}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobileNumber(e.target.value)}
        onClick={() => testCredentials}
        disabled={isDisabled()}
      >
        Validate credential
      </TextInputWithButton>

      <div className="separator"></div>

      <div className="progress-button">
        <PrimaryButton disabled={isDisabled()} onClick={onNext}>Send Message →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSCredentials
