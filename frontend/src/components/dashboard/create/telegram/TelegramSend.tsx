import React, { useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { Status, ChannelType } from 'classes'
import { ModalContext } from 'contexts/modal.context'
import {
  PreviewBlock,
  PrimaryButton,
  SendRate,
  ConfirmModal,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
} from 'components/common'
import { getPreviewMessage } from 'services/telegram.service'
import { sendCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

import styles from '../Create.module.scss'

const TelegramSend = ({
  numRecipients,
  onNext,
  onPrevious,
}: {
  numRecipients: number
  onNext: Function
  onPrevious: () => void
}) => {
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
      sendUserEvent(GA_USER_EVENTS.USE_SEND_RATE, ChannelType.Telegram)
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
          <PreviewBlock
            body={preview.body?.replace(/\n/g, '<br />')}
          ></PreviewBlock>
        </div>

        <div>
          <SendRate
            sendRate={sendRate}
            setSendRate={setSendRate}
            channelType={ChannelType.Telegram}
          />
        </div>
      </StepSection>

      <ButtonGroup>
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={openModal}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
        <TextButton onClick={onPrevious}>Previous</TextButton>
      </ButtonGroup>
    </>
  )
}

export default TelegramSend
