import React, { useState } from 'react'

import { sendPreviewMessage } from 'services/email.service'
import { PrimaryButton, TextInputWithButton, InfoBlock, ErrorBlock } from 'components/common'
import { useParams } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

const EmailCredentials = ({ hasCredential: initialHasCredential, onNext }: { hasCredential: boolean; onNext: (changes: any, next?: boolean) => void }) => {

  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [recipient, setRecipient] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams()

  function isButtonDisabled() {
    return !isEmail(recipient)
  }

  function resetFields() {
    setRecipient('')
  }

  async function handleTestSend() {
    setErrorMsg(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      setIsValidating(true)
      await sendPreviewMessage({
        campaignId: +campaignId,
        recipient,
      })
      setHasCredential(true)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: true }, false)
      resetFields()
    } catch (err) {
      setErrorMsg(err.message)
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
            onChange={setRecipient}
            onClick={handleTestSend}
            inputDisabled={isValidating}
            buttonDisabled={isButtonDisabled() || isValidating}
          >
            {
              isValidating ? 'Sending...' : (
                <>
                  Send test email
                  <i className="bx bx-envelope-open"></i>
                </>
              )
            }
          </TextInputWithButton>
          <ErrorBlock>
            {errorMsg}
          </ErrorBlock>

          {
            hasCredential &&
            <InfoBlock>
              <li>
                <i className="bx bx-check-circle"></i>
                <span>Email credentials have been validated but you may continue to send test messages.</span>
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
