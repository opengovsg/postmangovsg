import {
  useContext,
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
} from 'react'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import { campaignFeedbackUrl, confirmSendCampaign } from '../util'

import { ChannelType, EmailProgress } from 'classes'
import {
  EmailPreviewBlock,
  PrimaryButton,
  ConfirmModal,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
} from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'

import { getPreviewMessage } from 'services/email.service'

const EmailSend = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { numRecipients } = campaign
  const modalContext = useContext(ModalContext)
  const [preview, setPreview] = useState(
    {} as {
      body: string
      themedBody: string
      subject: string
      replyTo: string | null
      from: string
    }
  )
  const { id: campaignId } = useParams<{ id: string }>()

  if (!campaignId) {
    throw new Error('Invalid campaign id')
  }

  async function loadPreview(campaignId: string) {
    try {
      const msgPreview = await getPreviewMessage(+campaignId)
      if (msgPreview) {
        setPreview(msgPreview)
      }
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  useEffect(() => {
    if (!campaignId) return
    void loadPreview(campaignId)
  }, [campaignId])

  const onModalConfirm = () => {
    void confirmSendCampaign({
      campaignId: +campaignId,
      sendRate: 0,
      channelType: ChannelType.Email,
      updateCampaign,
    })
  }

  const openModal = () => {
    modalContext.setModalContent(
      <ConfirmModal
        title="Are you absolutely sure?"
        subtitle="Sending out a campaign is irreversible."
        buttonText="Confirm send now"
        buttonIcon="bx-send"
        onConfirm={onModalConfirm}
        needFeedback={true}
        feedbackUrl={campaignFeedbackUrl}
      />
    )
  }

  return (
    <>
      <StepSection>
        <StepHeader
          title="Your campaign is ready to be sent!"
          subtitle="Step 4"
        />
        <div className="separator"></div>

        <div>
          <p className={styles.greyText}>Number of recipients</p>
          <h4>{numRecipients}</h4>
        </div>

        <div>
          <p className={styles.greyText}>Message</p>
          <EmailPreviewBlock
            body={preview.body}
            themedBody={preview.themedBody}
            subject={preview.subject}
            replyTo={preview.replyTo}
            from={preview.from}
          />
        </div>
      </StepSection>

      <ButtonGroup>
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={openModal}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
        <TextButton onClick={() => setActiveStep((s) => s - 1)}>
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default EmailSend
