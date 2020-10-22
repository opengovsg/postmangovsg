import React, { useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { CampaignContext } from 'contexts/campaign.context'
import { EmailCampaign, Status } from 'classes'
import { ModalContext } from 'contexts/modal.context'
import { PreviewBlock, PrimaryButton, ConfirmModal } from 'components/common'
import { getPreviewMessage } from 'services/email.service'
import { sendCampaign } from 'services/campaign.service'

import styles from '../Create.module.scss'

const EmailSend = () => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const { numRecipients } = campaign
  const modalContext = useContext(ModalContext)
  const [preview, setPreview] = useState(
    {} as {
      body: string
      subject: string
      replyTo: string | null
      from: string
    }
  )
  const { id: campaignId } = useParams()

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
    loadPreview(campaignId)
  }, [campaignId])

  const onModalConfirm = async () => {
    await sendCampaign(+campaignId, 0)
    setCampaign(
      (campaign) => ({ ...campaign, status: Status.Sending } as EmailCampaign)
    )
  }

  const openModal = () => {
    modalContext.setModalContent(
      <ConfirmModal
        title="Are you absolutely sure?"
        subtitle="Sending out a campaign is irreversible."
        buttonText="Confirm send now"
        buttonIcon="bx-send"
        onConfirm={onModalConfirm}
      />
    )
  }

  return (
    <>
      <sub>Step 4</sub>
      <h2>Your campaign is ready to be sent!</h2>
      <div className="separator"></div>

      <div className={styles.sendInfo}>
        <p className={styles.greyText}>Number of recipients</p>
        <h4>{numRecipients}</h4>

        <p className={styles.greyText}>Message</p>
        <PreviewBlock
          body={preview.body}
          subject={preview.subject}
          replyTo={preview.replyTo}
          from={preview.from}
        />
      </div>

      <div className="separator"></div>

      <div className="progress-button">
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={openModal}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
      </div>
    </>
  )
}

export default EmailSend
