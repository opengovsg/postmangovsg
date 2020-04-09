import React, { useState } from 'react'
import cx from 'classnames'

import { ChannelType } from 'classes/Campaign'
import { TextInput, PrimaryButton } from 'components/common'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelopeOpen, faEnvelopeOpenText, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import styles from './CreateCampaign.module.scss'

const CreateCampaign = () => {
  const [selectedChannel, setSelectedChannel] = useState(ChannelType.SMS)

  const handleSelectChannel = (channel: ChannelType) => {
    setSelectedChannel(channel)
  }

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.title}>Name your campaign</h2>
        <h5>Give your campaign a descriptive name</h5>
        <TextInput></TextInput>
      </div>
      <div className={cx(styles.section, styles.separator)}>
        <h2 className={styles.title}>Choose the channel you want to send in</h2>
        <h5>Choosing a channel is irreversible. If you would like to change channels halfway, you will have to restart.
          You may only edit your message or re-upload recipients list. Please proceed with caution.</h5>

        <div className={styles.channelTypes}>
          <PrimaryButton
            className={cx(styles.button, { [styles.active]: selectedChannel === ChannelType.SMS })}
            onClick={() => handleSelectChannel(ChannelType.SMS)}
          >
            <h2>SMS</h2>
            <FontAwesomeIcon className={styles.icon} icon={faEnvelopeOpenText}></FontAwesomeIcon>
          </PrimaryButton>
          <PrimaryButton
            className={cx(styles.button, { [styles.active]: selectedChannel === ChannelType.Email })}
            onClick={() => handleSelectChannel(ChannelType.Email)}
          >
            <h2>Email</h2>
            <FontAwesomeIcon className={styles.icon} icon={faEnvelopeOpen}></FontAwesomeIcon>
          </PrimaryButton>
        </div>

        <p className={styles.subtext}>Get your credentials ready. <a>What is this?</a></p>
      </div>


      <PrimaryButton className={cx(styles.button, styles.bottom)}>
        <p>Create campaign</p>
        <FontAwesomeIcon className={styles.icon} icon={faArrowRight}></FontAwesomeIcon>
      </PrimaryButton>
    </>
  )
}

export default CreateCampaign