import { useEffect, useState } from 'react'
import { i18n } from '@lingui/core'
import { LabelWithExternalLink, TextInput } from 'components/common'
import { LINKS } from 'config'

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
        htmlFor="accountSid"
        label="Account SID"
        link={i18n._(LINKS.guideSmsAccountSidUrl)}
      />
      <TextInput
        id="accountSid"
        placeholder="Enter Account SID"
        value={accountSid}
        onChange={setAccountSid}
      />

      <LabelWithExternalLink
        htmlFor="apiKeySid"
        label="API Key SID"
        link={i18n._(LINKS.guideSmsApiKeyUrl)}
      />
      <TextInput
        id="apiKeySid"
        placeholder="Enter API Key SID"
        value={apiKey}
        onChange={setApiKey}
      />

      <LabelWithExternalLink
        htmlFor="apiSecret"
        label="API Secret"
        link={i18n._(LINKS.guideSmsApiKeyUrl)}
      />
      <TextInput
        id="apiSecret"
        placeholder="Enter API Secret"
        value={apiSecret}
        onChange={setApiSecret}
      />

      <LabelWithExternalLink
        htmlFor="messagingServiceSid"
        label="Messaging Service ID"
        link={i18n._(LINKS.guideSmsMessagingServiceUrl)}
      />
      <TextInput
        id="messagingServiceSid"
        placeholder="Enter Messaging Service ID"
        value={messagingServiceSid}
        onChange={setMessagingServiceSid}
      />
    </>
  )
}

export default TwilioCredentialsInput
