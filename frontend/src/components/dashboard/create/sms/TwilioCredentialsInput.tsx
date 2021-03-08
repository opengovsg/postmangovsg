import React, { useState, useEffect } from 'react'

import { LINKS } from 'config'
import { TextInput, LabelWithExternalLink } from 'components/common'
import { i18n } from '@lingui/core'

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
        link={i18n._(LINKS.guideSmsAccountSidUrl)}
      />
      <TextInput
        placeholder="Enter Account SID"
        value={accountSid}
        onChange={setAccountSid}
      />

      <LabelWithExternalLink
        label="API Key SID"
        link={i18n._(LINKS.guideSmsApiKeyUrl)}
      />
      <TextInput
        placeholder="Enter API Key SID"
        value={apiKey}
        onChange={setApiKey}
      />

      <LabelWithExternalLink
        label="API Secret"
        link={i18n._(LINKS.guideSmsApiKeyUrl)}
      />
      <TextInput
        placeholder="Enter API Secret"
        value={apiSecret}
        onChange={setApiSecret}
      />

      <LabelWithExternalLink
        label="Messaging Service ID"
        link={i18n._(LINKS.guideSmsMessagingServiceUrl)}
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
