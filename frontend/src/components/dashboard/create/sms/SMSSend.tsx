import { useContext, useEffect, useState } from 'react'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import { campaignFeedbackUrl, confirmSendCampaign } from '../util'

import { ChannelType } from 'classes'
import {
  ButtonGroup,
  ConfirmModal,
  PreviewBlock,
  PrimaryButton,
  SendRate,
  StepHeader,
  StepSection,
} from 'components/common'
import SchedulingButton from 'components/dashboard/create/common/SchedulingButton'
import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'

import { getPreviewMessage } from 'services/sms.service'

const SMSSend = () => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { numRecipients } = campaign
  const modalContext = useContext(ModalContext)
  const [preview, setPreview] = useState({} as { body: string })
  const [sendRate, setSendRate] = useState('')
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
      sendRate: +sendRate,
      channelType: ChannelType.SMS,
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
      </StepSection>

      <StepSection>
        <div>
          <p className={styles.greyText}>Number of recipients</p>
          <h4>{numRecipients}</h4>
        </div>

        <div>
          <p className={styles.greyText}>Message</p>
          <PreviewBlock body={preview.body}></PreviewBlock>
        </div>

        <div>
          <SendRate
            sendRate={sendRate}
            setSendRate={setSendRate}
            channelType={ChannelType.SMS}
          />
        </div>
      </StepSection>

      <ButtonGroup>
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={openModal}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
        <SchedulingButton
          campaign={campaign}
          updateCampaign={updateCampaign}
          buttonText={'Schedule for later'}
          scheduledCallback={function handle() {
            return
          }}
        />
      </ButtonGroup>
    </>
  )
}

export default SMSSend
