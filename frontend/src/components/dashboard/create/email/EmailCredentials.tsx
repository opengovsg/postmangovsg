import React, { useState } from 'react'

import { sendPreviewMessage } from 'services/email.service'
import { PrimaryButton, TextInputWithButton, InfoBlock } from 'components/common'
import { useParams } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

const EmailCredentials = ({ hasCredential: initialHasCredential, onNext }: { hasCredential: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [recipient, setRecipient] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const params: { id?: string } = useParams()

  function isButtonDisabled() {
    return !isEmail(recipient)
  }

  function resetFields() {
    setRecipient('')
  }

  async function handleTestSend() {
    try {
      setIsValidating(true)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const campaignId = +params.id!
      const isValid = await sendPreviewMessage({
        campaignId,
        recipient,
      })
      setHasCredential(isValid)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: isValid }, false)
      resetFields()
    } catch (err) {
      console.error(err)
    }
    setIsValidating(false)
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
            inputDisabled={isValidating}
            buttonDisabled={isButtonDisabled() || isValidating}
          >
            Test your email
          </TextInputWithButton>

          {
            hasCredential &&
            <InfoBlock>
              <li>
                <i className="bx bx-check-circle"></i>
                <span>Email credentails have been validated but you may continue to send test messages.</span>
              </li>
            </InfoBlock>
          }

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
