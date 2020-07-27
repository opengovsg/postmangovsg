import React, { useState, useEffect } from 'react'

import {
  GUIDE_SMS_API_KEY_URL,
  GUIDE_SMS_ACCOUNT_SID_URL,
  GUIDE_SMS_MESSAGING_SERVICE_URL,
} from 'config'
import { TextInput, LabelWithExternalLink } from 'components/common'

export interface TwilioCredentials {
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string
}

const TwilioCredentialsInput = ({
  onFilled,
}: {
  onFilled: (input: TwilioCredentials | null) => any
}) => {
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
  }, [accountSid, apiKey, apiSecret, messagingServiceSid, onFilled])

  return (
    <>
      <LabelWithExternalLink
        label="Account SID"
        link={GUIDE_SMS_ACCOUNT_SID_URL}
      />
      <TextInput
        placeholder="Enter Account SID"
        value={accountSid}
        onChange={setAccountSid}
      />

      <LabelWithExternalLink label="API Key SID" link={GUIDE_SMS_API_KEY_URL} />
      <TextInput
        placeholder="Enter API Key SID"
        value={apiKey}
        onChange={setApiKey}
      />

      <LabelWithExternalLink label="API Secret" link={GUIDE_SMS_API_KEY_URL} />
      <TextInput
        placeholder="Enter API Secret"
        value={apiSecret}
        onChange={setApiSecret}
      />

      <LabelWithExternalLink
        label="Messaging Service ID"
        link={GUIDE_SMS_MESSAGING_SERVICE_URL}
      />
      <TextInput
        placeholder="Enter Messaging Service ID"
        value={messagingServiceSid}
        onChange={setMessagingServiceSid}
      />
    </>
  )
}

export default TwilioCredentialsInput
