import React, { useContext, useEffect, useState } from 'react'
import cx from 'classnames'
import styles from './CreateTrialModal.module.scss'
import { Campaign, channelIcons, ChannelType } from 'classes/Campaign'
import { ErrorBlock, PrimaryButton, TextInput } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { useHistory } from 'react-router-dom'
import { createCampaign } from 'services/campaign.service'
import { i18n } from '@lingui/core'
import { LINKS } from 'config'
import { OutboundLink } from 'react-ga'
const CreateTrialModal = ({
  trialInfo,
}: {
  trialInfo: { numTrialsSms: number }
}) => {
  const modalContext = useContext(ModalContext)
  const history = useHistory()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedChannel, setSelectedChannel] = useState(ChannelType.SMS)
  const [selectedName, setSelectedName] = useState('')
  useEffect(() => {
    let index
    switch (selectedChannel) {
      case ChannelType.SMS:
        index = 4 - trialInfo.numTrialsSms
        break
      default:
        index = 1
    }
    setSelectedName(`${selectedChannel} Demo ${index}`)
  }, [selectedChannel, trialInfo.numTrialsSms])

  async function createTrial() {
    try {
      const campaign: Campaign = await createCampaign({
        name: selectedName,
        type: selectedChannel,
        trialMessageLimit: 20,
      })
      // close modal and go to create view
      modalContext.setModalContent(null)
      history.push(`/campaigns/${campaign.id}`)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }
  return (
    <>
      <div className={styles.modalHeader}>
        You have {trialInfo.numTrialsSms}/3 SMS demo campaigns left
      </div>
      <div className={styles.section}>
        <h5 className={styles.subtitle}>
          The demo campaign has been named for you
        </h5>
        <TextInput
          className={styles.input}
          type="text"
          value={selectedName}
          disabled
        ></TextInput>
      </div>
      <div className={cx(styles.section, styles.separator)}>
        <h2 className={styles.title}>Choose the channel you want to send in</h2>
        <h5 className={styles.subtitle}>
          Demo campaigns are for SMS and Telegram channels only, as the Email
          channel is already free. You may send messages to at most 20
          recipients in each campaign. One try will be used up only after a demo
          campaign has been sent, otherwise, it will stay as a draft.
        </h5>
      </div>

      <div className={styles.channelTypes}>
        <div className={styles.channelContainer}>
          <PrimaryButton
            className={cx(styles.button, {
              [styles.active]: selectedChannel === ChannelType.SMS,
            })}
            onClick={() => setSelectedChannel(ChannelType.SMS)}
          >
            SMS
            <i
              className={cx('bx', styles.icon, channelIcons[ChannelType.SMS])}
            ></i>
          </PrimaryButton>
        </div>
        {/* <div className={styles.channelContainer}>
          <PrimaryButton
            className={cx(styles.button, {
              [styles.active]: selectedChannel === ChannelType.Telegram,
            })}
            onClick={() => setSelectedChannel(ChannelType.Telegram)}
          >
            Telegram
            <i
              className={cx(
                'bx',
                styles.icon,
                channelIcons[ChannelType.Telegram]
              )}
            ></i>
          </PrimaryButton>
        </div> */}
      </div>
      <div className="separator"></div>
      <div className={styles.actions}>
        <OutboundLink
          eventLabel={i18n._(LINKS.guideDemoUrl)}
          to={i18n._(LINKS.guideDemoUrl)}
          target="_blank"
        >
          Learn more about demos
        </OutboundLink>
        {/* <TextButton
          minButtonWidth
          onClick={() => {
            console.log('watch')
          }}
        >
          Learn more about demos
        </TextButton> */}
        <PrimaryButton onClick={createTrial}>
          Create demo campaign
        </PrimaryButton>
      </div>
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </>
  )
}

export default CreateTrialModal
