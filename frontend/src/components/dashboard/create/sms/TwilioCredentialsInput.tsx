import React, { useState, useEffect } from 'react'

import { TextInput } from 'components/common'

export interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  messagingServiceSid: string;
}

const TwilioCredentialsInput = ({ onFilled }: { onFilled: (input: TwilioCredentials | null) => any }) => {
  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')

  useEffect(() => {
    if (accountSid && apiKey && apiSecret && messagingServiceSid) {
      onFilled({ accountSid, apiKey, apiSecret, messagingServiceSid })
    } else {
      onFilled(null)
    }
  }, [accountSid, apiKey, apiSecret, messagingServiceSid])

  return (
    <>
      <h5>Account SID</h5>
      <TextInput
        placeholder="Enter Account SID"
        value={accountSid}
        onChange={setAccountSid}
      />

      <h5>API Key</h5>
      <TextInput
        placeholder="Enter API Key"
        value={apiKey}
        onChange={setApiKey}
      />

      <h5>API Secret</h5>
      <TextInput
        placeholder="Enter API Secret"
        value={apiSecret}
        onChange={setApiSecret}
      />

      <h5>Messaging Service ID</h5>
      <TextInput
        placeholder="Enter Messaging Service ID"
        value={messagingServiceSid}
        onChange={setMessagingServiceSid}
      />
    </>
  )
}

export default TwilioCredentialsInput
