import React, { useState } from 'react'

import { validateCredentials } from 'services/sms.service'
import { TextInput, PrimaryButton, TextInputWithButton } from 'components/common'
import styles from '../Create.module.scss'
import { useParams } from 'react-router-dom'

const SMSCredentials = ({ hasCredential: initialHasCredential, onNext }: { hasCredential: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [accountSid, setAccountSid] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  const [recipient, setRecipient] = useState('')
  const [showCredentialFields, setShowCredentialFields] = useState(!hasCredential)
  const params: { id? : string } = useParams()

  function isButtonDisabled() {
    return !accountSid || !apiKey || !apiSecret || !messagingServiceSid || !(/^\+?\d+$/g).test(recipient)
  }

  function resetFields() {
    setAccountSid('')
    setApiKey('')
    setApiSecret('')
    setMessagingServiceSid('')
    setRecipient('')
  }

  async function handleValidateCredentials() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const campaignId = +params.id!
      const isValid = await validateCredentials({
        campaignId,
        accountSid,
        apiKey,
        apiSecret,
        messagingServiceSid,
        recipient })
      setHasCredential(isValid)
      setShowCredentialFields(false)
      resetFields()
    } catch(err){
      console.error(err)
    }
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
          value={recipient}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
          onClick={handleValidateCredentials}
          buttonDisabled={isButtonDisabled()}
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
        hasCredential
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
                <PrimaryButton disabled={!hasCredential} onClick={onNext}>Send Messages →</PrimaryButton>
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
