import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'
import SchedulingButton from '../common/SchedulingButton/SchedulingButton'

import { campaignFeedbackUrl, confirmSendCampaign } from '../util'

import { ChannelType } from 'classes'
import {
  ButtonGroup,
  ConfirmModal,
  PreviewBlock,
  PrimaryButton,
  StepHeader,
  StepSection,
} from 'components/common'

import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'
import { getPreviewMessage } from 'services/govsg.service'

function GovsgSend() {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const [preview, setPreview] = useState({} as { body: string })
  const modalContext = useContext(ModalContext)

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

  const onModalConfirm = () => {
    void confirmSendCampaign({
      campaignId: +campaignId,
      channelType: ChannelType.Govsg,
      sendRate: 0,
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

  useEffect(() => {
    if (!campaignId) return
    void loadPreview(campaignId)
  }, [campaignId])
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
          <h4>{campaign.numRecipients}</h4>
        </div>
        <div>
          <p className={styles.greyTect}>Message</p>
          <PreviewBlock body={preview.body} />
        </div>
      </StepSection>

      <ButtonGroup>
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={openModal}>
          Send campaign now <i className="bx bx-send" />
        </PrimaryButton>
        <SchedulingButton
          campaign={campaign}
          updateCampaign={updateCampaign}
          buttonText="Schedule for later"
        />
      </ButtonGroup>
    </>
  )
}

export default GovsgSend
