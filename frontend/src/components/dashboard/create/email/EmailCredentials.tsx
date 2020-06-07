import React, { useState } from 'react'

import { sendPreviewMessage } from 'services/email.service'
import { PrimaryButton, InfoBlock, ErrorBlock } from 'components/common'
import { useParams } from 'react-router-dom'

import EmailValidationInput from './EmailValidationInput'

const EmailCredentials = ({
  hasCredential: initialHasCredential,
  onNext,
}: {
  hasCredential: boolean
  onNext: (changes: any, next?: boolean) => void
}) => {
  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams()

  async function handleTestSend(recipient: string) {
    setErrorMsg(null)
    try {
      if (!campaignId) {
        throw new Error('Invalid campaign id')
      }
      await sendPreviewMessage({
        campaignId: +campaignId,
        recipient,
      })
      setHasCredential(true)
      // Saves hasCredential property but do not advance to next step
      onNext({ hasCredential: true }, false)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <>
      <sub>Step 3</sub>
      {
        <>
          <h2>Send a test email</h2>
          <p>You can preview your message by sending an email to yourself. </p>
          <EmailValidationInput onClick={handleTestSend} />
          <ErrorBlock>{errorMsg}</ErrorBlock>

          {hasCredential && (
            <InfoBlock>
              <li>
                <i className="bx bx-check-circle"></i>
                <span>
                  Email credentials have been validated but you may continue to
                  send test messages.
                </span>
              </li>
            </InfoBlock>
          )}

          <div className="separator"></div>

          <div className="progress-button">
            <PrimaryButton disabled={!hasCredential} onClick={onNext}>
              Send messages →
            </PrimaryButton>
          </div>
        </>
      }
    </>
  )
}

export default EmailCredentials
