import React, { useContext, useState, Dispatch, SetStateAction } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { sendPreviewMessage } from 'services/email.service'
import {
  NextButton,
  DetailBlock,
  ErrorBlock,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
} from 'components/common'
import { useParams } from 'react-router-dom'

import EmailValidationInput from './EmailValidationInput'
import { EmailProgress } from 'classes'

const EmailCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
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
      updateCampaign({ hasCredential: true })
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <>
      {
        <>
          <StepSection>
            <StepHeader title="Send a test email" subtitle="Step 3">
              <p>
                You can preview your message by sending an email to yourself.{' '}
              </p>
              {protect && (
                <p>
                  You will receive an email from postman.gov.sg showing the
                  email that the recipient would receive once you click send
                  campaign. You can click on the unique link and unlock the
                  password protected page using the corresponding recipient
                  password in your uploaded csv.
                </p>
              )}
            </StepHeader>
            <EmailValidationInput onClick={handleTestSend} />
            <ErrorBlock>{errorMsg}</ErrorBlock>

            {hasCredential && (
              <DetailBlock>
                <li>
                  <i className="bx bx-check-circle"></i>
                  <span>
                    Email credentials have been validated but you may continue
                    to send test messages.
                  </span>
                </li>
              </DetailBlock>
            )}
          </StepSection>

          <ButtonGroup>
            <NextButton
              disabled={!hasCredential}
              onClick={() => setActiveStep((s) => s + 1)}
            />
            <TextButton onClick={() => setActiveStep((s) => s - 1)}>
              Previous
            </TextButton>
          </ButtonGroup>
        </>
      }
    </>
  )
}

export default EmailCredentials
