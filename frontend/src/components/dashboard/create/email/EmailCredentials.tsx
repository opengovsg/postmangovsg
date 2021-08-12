import { useContext, useState, Dispatch, SetStateAction } from 'react'

import { useParams } from 'react-router-dom'

import EmailValidationInput from './EmailValidationInput'

import { EmailProgress } from 'classes'
import { ErrorBlock, StepHeader } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'

import { sendPreviewMessage } from 'services/email.service'

const EmailCredentials = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { protect } = campaign
  const [errorMsg, setErrorMsg] = useState(null)
  const { id: campaignId } = useParams<{ id: string }>()

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
      // Saves hasCredential property but do not advance to next step
      updateCampaign({ hasCredential: true })
      setActiveStep((s) => s + 1)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <>
      {
        <>
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
        </>
      }
    </>
  )
}

export default EmailCredentials
