import React, { useState } from 'react'
import cx from 'classnames'

import { ChannelType } from 'classes/Campaign'
import { TextInput, PrimaryButton } from 'components/common'
import styles from './CreateModal.module.scss'

const CreateModal = () => {
  const [selectedChannel, setSelectedChannel] = useState(ChannelType.SMS)

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.title}>Name your campaign</h2>
        <h5 className={styles.subtitle}>Give your campaign a descriptive name</h5>
        <TextInput className={styles.input}></TextInput>
      </div>
      <div className={cx(styles.section, styles.separator)}>
        <h2 className={styles.title}>Choose the channel you want to send in</h2>
        <h5 className={styles.subtitle}>Choosing a channel is irreversible. If you would like to change channels halfway, you will have to restart.
          You may only edit your message or re-upload recipients list. Please proceed with caution.</h5>

        <div className={styles.channelTypes}>
          <PrimaryButton
            className={cx(styles.button, { [styles.active]: selectedChannel === ChannelType.SMS })}
            onClick={() => setSelectedChannel(ChannelType.SMS)}
          >
            SMS
            <i className={cx('bx', styles.icon, 'bx-message-detail')}></i>
          </PrimaryButton>
          <PrimaryButton
            className={cx(styles.button, { [styles.active]: selectedChannel === ChannelType.Email })}
            onClick={() => setSelectedChannel(ChannelType.Email)}
          >
            Email
            <i className={cx('bx', styles.icon, 'bx-envelope-open')}></i>
          </PrimaryButton>
        </div>

        <p className={styles.subtext}>Get your credentials ready. <a href="#">What is this?</a></p>
      </div>

      <div className="separator"></div>


      <div className="progress-button">
        <PrimaryButton className={styles.bottomButton}>
          Create campaign
          <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
        </PrimaryButton>
      </div>
    </>
  )
}

export default CreateModal