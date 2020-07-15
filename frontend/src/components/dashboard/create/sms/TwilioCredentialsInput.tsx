import React, { useState, useEffect } from 'react'

import {
  GUIDE_SMS_API_KEY_URL,
  GUIDE_SMS_ACCOUNT_SID_URL,
  GUIDE_SMS_MESSAGING_SERVICE_URL,
} from 'config'
import { TextInput } from 'components/common'
import styles from '../Create.module.scss'

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

  const renderLabel = (label: string, link: string) => (
    <>
      <h5>{label}</h5>
      <a href={link} target="_blank" rel="noopener noreferrer">
        <i className="bx bx-link-external" />
      </a>
    </>
  )

  return (
    <div className={styles.twilioCredentialsInput}>
      {renderLabel('Account SID', GUIDE_SMS_ACCOUNT_SID_URL)}
      <TextInput
        placeholder="Enter Account SID"
        value={accountSid}
        onChange={setAccountSid}
      />

      {renderLabel('API Key SID', GUIDE_SMS_API_KEY_URL)}
      <TextInput
        placeholder="Enter API Key SID"
        value={apiKey}
        onChange={setApiKey}
      />

      {renderLabel('API Secret', GUIDE_SMS_API_KEY_URL)}
      <TextInput
        placeholder="Enter API Secret"
        value={apiSecret}
        onChange={setApiSecret}
      />

      {renderLabel('Messaging Service ID', GUIDE_SMS_MESSAGING_SERVICE_URL)}
      <TextInput
        placeholder="Enter Messaging Service ID"
        value={messagingServiceSid}
        onChange={setMessagingServiceSid}
      />
    </div>
  )
}

export default TwilioCredentialsInput
