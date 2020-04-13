import React, { useState } from 'react'

import { testCredentials } from 'services/sms.service'
import { Credentials, PrimaryButton, TextInputWithButton } from 'components/common'

const SMSCredentials = ({ hasCredentials, onNext }: { hasCredentials: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  function isDisabled() {
    return !accountSid || !apiKey || !apiSecret || !messagingServiceSid
  }

  const credentials = [
    {
      label: 'Account SID',
      value: accountSid,
      setValue: setAccountSid,
    },
    {
      label: 'API Key',
      value: apiKey,
      setValue: setApiKey,
    },
    {
      label: 'API Secret',
      value: apiSecret,
      setValue: setApiSecret,
    },
    {
      label: 'Messaging Service ID',
      value: messagingServiceSid,
      setValue: setMessagingServiceSid,
    },
  ]

  return (
    <>
      <sub>Step 3</sub>
      <h2>Insert your SMS credentials</h2>
      <Credentials hasCredentials={hasCredentials} credentials={credentials} />

      <h2>We encourage you to do a test send</h2>
      <p>To ensure your credentials are working perfectly, you may send a test SMS to double check for accuracy.</p>
      <TextInputWithButton
        type="tel"
        value={mobileNumber}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobileNumber(e.target.value)}
        onClick={() => testCredentials}
        disabled={isDisabled()}
      >
        Send a test sms
      </TextInputWithButton>

      <div className="align-right">
        <PrimaryButton disabled={isDisabled()} onClick={onNext}>Send Message→</PrimaryButton>
      </div>
    </>
  )
}

export default SMSCredentials
