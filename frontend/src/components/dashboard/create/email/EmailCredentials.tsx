import React, { useContext, useState, Dispatch, SetStateAction } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { sendPreviewMessage } from 'services/email.service'
import { NextButton, InfoBlock, ErrorBlock } from 'components/common'
import { useParams } from 'react-router-dom'

import EmailValidationInput from './EmailValidationInput'
import { EmailCampaign, EmailProgress } from 'classes'

const EmailCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { hasCredential: initialHasCredential, protect } = campaign
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
      setCampaign(
        (campaign) => ({ ...campaign, hasCredential: true } as EmailCampaign)
      )
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
          {protect && (
            <p>
              You will receive an email from postman.gov.sg showing the email
              that the recipient would receive once you click send campaign. You
              can click on the unique link and unlock the password protected
              page using the corresponding recipient password in your uploaded
              csv.
            </p>
          )}
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

          <NextButton
            disabled={!hasCredential}
            onClick={() => setActiveStep((s) => s + 1)}
          />
        </>
      }
    </>
  )
}

export default EmailCredentials
