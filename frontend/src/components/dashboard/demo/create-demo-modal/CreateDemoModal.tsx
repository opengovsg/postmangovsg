import cx from 'classnames'

import { useContext, useEffect, useState } from 'react'

import { useHistory } from 'react-router-dom'

import styles from './CreateDemoModal.module.scss'

import { channelIcons, ChannelType } from 'classes/Campaign'
import type { Campaign } from 'classes/Campaign'
import {
  ErrorBlock,
  PrimaryButton,
  TextButton,
  TextInput,
} from 'components/common'
import DemoVideoModal from 'components/dashboard/demo/demo-video-modal'
import { ModalContext } from 'contexts/modal.context'

import { createCampaign } from 'services/campaign.service'

const CreateDemoModal = ({
  numDemosSms,
  numDemosTelegram,
  duplicateCampaign,
}: {
  numDemosSms: number
  numDemosTelegram: number
  duplicateCampaign?: { name: string; type: ChannelType }
}) => {
  const { close, setModalTitle, setModalContent } = useContext(ModalContext)
  const history = useHistory()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedChannel, setSelectedChannel] = useState(
    duplicateCampaign?.type || ChannelType.SMS
  )
  const [selectedName, setSelectedName] = useState('')
  //const [demoCampaignMessage, setDemoCampaignMessage] = useState('')
  const [isCreateEnabled, setIsCreateEnabled] = useState(true)

  useEffect(() => {
    // Handle case where one of the channels does not have any demos left
    // Set the default selected channel to the channel that still has demos left
    if (numDemosSms) {
      setSelectedChannel(duplicateCampaign?.type || ChannelType.SMS)
    } else {
      setSelectedChannel(ChannelType.Telegram)
    }
  }, [duplicateCampaign, numDemosSms])

  useEffect(() => {
    let numDemosChannel
    let message
    switch (selectedChannel) {
      case ChannelType.SMS:
        numDemosChannel = numDemosSms
        message = `You have ${numDemosChannel}/3 SMS demo campaigns left`
        break
      case ChannelType.Telegram:
        numDemosChannel = numDemosTelegram
        message = `You have ${numDemosChannel}/3 Telegram demo campaigns left`
        break
      default:
        message = `Demo campaigns are not supported for campaign type ${selectedChannel} `
    }
    setSelectedName(
      (duplicateCampaign && `Copy of ${duplicateCampaign.name}`) ||
        `${selectedChannel} Demo ${
          (numDemosChannel && 4 - numDemosChannel) || ''
        }`
    )
    setModalTitle(message)
    setIsCreateEnabled(!!numDemosChannel)
  }, [
    duplicateCampaign,
    numDemosSms,
    numDemosTelegram,
    selectedChannel,
    setModalTitle,
  ])

  async function createDemo() {
    try {
      const campaign: Campaign = await createCampaign({
        name: selectedName,
        type: selectedChannel,
        demoMessageLimit: 20,
      })
      // close modal and go to create view
      close()
      history.push(`/campaigns/${campaign.id}`)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  function showDemoVideoModal() {
    setModalTitle(null)
    setModalContent(
      <DemoVideoModal
        numDemosSms={numDemosSms}
        numDemosTelegram={numDemosTelegram}
      />
    )
  }

  return (
    <>
      <div className={styles.content}>
        <div className={styles.section}>
          <h5 className={cx(styles.subtitle, styles.inputLabel)}>
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
          <h2 className={styles.title}>
            Choose the channel you want to send in
          </h2>
          <h5 className={styles.subtitle}>
            Demo campaigns are for SMS and Telegram channels only, as the Email
            channel is already free. You may send messages to at most 20
            recipients in each campaign. One try will be used up only after a
            demo campaign has been sent, otherwise, it will stay as a draft.
          </h5>
        </div>

        <div className={styles.channelTypes}>
          <div className={styles.channelContainer}>
            <PrimaryButton
              className={cx(styles.button, {
                [styles.active]: selectedChannel === ChannelType.SMS,
              })}
              disabled={
                duplicateCampaign && duplicateCampaign.type !== ChannelType.SMS
              }
              onClick={
                selectedChannel === ChannelType.SMS
                  ? undefined
                  : () => setSelectedChannel(ChannelType.SMS)
              }
            >
              SMS
              <i
                className={cx('bx', styles.icon, channelIcons[ChannelType.SMS])}
              ></i>
            </PrimaryButton>
          </div>
          <div className={styles.channelContainer}>
            <PrimaryButton
              className={cx(styles.button, {
                [styles.active]: selectedChannel === ChannelType.Telegram,
              })}
              disabled={
                duplicateCampaign &&
                duplicateCampaign.type !== ChannelType.Telegram
              }
              onClick={
                selectedChannel === ChannelType.Telegram
                  ? undefined
                  : () => setSelectedChannel(ChannelType.Telegram)
              }
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
          </div>
        </div>
        <div className="separator"></div>
        <div className={styles.actions}>
          <TextButton className={styles.action} onClick={showDemoVideoModal}>
            Watch the video
          </TextButton>

          <PrimaryButton
            className={styles.action}
            onClick={createDemo}
            disabled={!isCreateEnabled}
          >
            {duplicateCampaign ? 'Duplicate' : 'Create'} demo campaign
          </PrimaryButton>
        </div>
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </div>
    </>
  )
}

export default CreateDemoModal
