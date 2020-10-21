import React, { useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { Status, ChannelType } from 'classes'
import { ModalContext } from 'contexts/modal.context'
import {
  PreviewBlock,
  PrimaryButton,
  SendRate,
  ConfirmModal,
} from 'components/common'
import { getPreviewMessage } from 'services/sms.service'
import { sendCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

import styles from '../Create.module.scss'

const SMSSend = ({
  numRecipients,
  onNext,
}: {
  numRecipients: number
  onNext: Function
}) => {
  console.log('SMSSend')
  const modalContext = useContext(ModalContext)
  const [preview, setPreview] = useState({} as { body: string })
  const [sendRate, setSendRate] = useState('')
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
    await sendCampaign(+campaignId, +sendRate)
    if (sendRate) {
      sendUserEvent(GA_USER_EVENTS.USE_SEND_RATE, ChannelType.SMS)
    }
    onNext({ status: Status.Sending }, false)
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
        <PreviewBlock body={preview.body}></PreviewBlock>
      </div>

      <SendRate
        sendRate={sendRate}
        setSendRate={setSendRate}
        channelType={ChannelType.SMS}
      />

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

export default SMSSend
