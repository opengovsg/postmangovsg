import React, { useState } from 'react'

import { sendPreviewMessage } from 'services/email.service'
import { PrimaryButton, TextInputWithButton } from 'components/common'
import { useParams } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

const EmailCredentials = ({ hasCredential: initialHasCredential, onNext }: { hasCredential: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [recipient, setRecipient] = useState('')
  const [testSending, setTestSending] = useState(false)
  const params: { id?: string } = useParams()

  function isButtonDisabled() {
    return testSending || !isEmail(recipient)
  }

  function resetFields() {
    setRecipient('')
  }

  async function handleTestSend() {
    try {
      setTestSending(true)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const campaignId = +params.id!
      const isValid = await sendPreviewMessage({
        campaignId,
        recipient,
      })
      setHasCredential(isValid)
      resetFields()
    } catch (err) {
      console.error(err)
      setTestSending(false)
    }
  }

  return (
    <>
      <sub>Step 3</sub>
      {
        <>
          <h2>Send a test email</h2>
          <p>You can preview your message by sending an email to yourself. </p>
          <TextInputWithButton
            type="email"
            value={recipient}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
            onClick={handleTestSend}
            buttonDisabled={isButtonDisabled()}
          >
            Test your email
          </TextInputWithButton>

          <div className="separator"></div>

          <div className="progress-button">
            <PrimaryButton disabled={!hasCredential} onClick={onNext}>Send Messages →</PrimaryButton>
          </div>
        </>
      }
    </>
  )
}

export default EmailCredentials
