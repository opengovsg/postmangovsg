import { useContext, useState, Dispatch, SetStateAction } from 'react'

import { useParams } from 'react-router-dom'

import EmailValidationInput from './EmailValidationInput'

import { EmailProgress } from 'classes'
import {
  NextButton,
  DetailBlock,
  ErrorBlock,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
} from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'

import { sendPreviewMessage } from 'services/email.service'

const EmailCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { hasCredential: initialHasCredential, protect } = campaign
  const [hasCredential, setHasCredential] = useState(initialHasCredential)
  const [errorMsg, setErrorMsg] = useState('')
  const { id: campaignId } = useParams<{ id: string }>()

  async function handleTestSend(recipient: string) {
    setErrorMsg('')
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
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <>
      {
        <>
          <StepSection>
            <StepHeader title="Send a test email" subtitle="Step 3">
              <p>
                <label htmlFor="validateEmail">
                  You can preview your message by sending an email to yourself.
                </label>
              </p>
              {protect && (
                <p>
                  <label htmlFor="validateEmail">
                    You will receive an email from postman.gov.sg showing the
                    email that the recipient would receive once you click send
                    campaign. You can click on the unique link and unlock the
                    password protected page using the corresponding recipient
                    password in your uploaded csv.
                  </label>
                </p>
              )}
            </StepHeader>
            <div>
              <EmailValidationInput onClick={handleTestSend} />
            </div>
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
