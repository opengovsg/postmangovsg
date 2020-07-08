import React, { useState, useContext } from 'react'
import { OutboundLink } from 'react-ga'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'

import { GUIDE_SMS_CREDENTIALS_URL } from 'config'
import { ChannelType, channelIcons, Campaign } from 'classes/Campaign'
import { TextInput, PrimaryButton } from 'components/common'
import styles from './CreateModal.module.scss'
import { createCampaign } from 'services/campaign.service'
import { ModalContext } from 'contexts/modal.context'

import AddCredentialModal from 'components/dashboard/settings/add-credential-modal'

const CreateModal = ({
  name = '',
  channelType = ChannelType.SMS,
}: {
  name?: string
  channelType?: ChannelType
}) => {
  const modalContext = useContext(ModalContext)
  const history = useHistory()
  const [selectedChannel, setSelectedChannel] = useState(channelType)
  const [selectedName, setSelectedName] = useState(name)

  async function handleCreateCampaign() {
    try {
      const campaign: Campaign = await createCampaign(
        selectedName,
        selectedChannel
      )
      // close modal and go to create view
      modalContext.setModalContent(null)
      history.push(`/campaigns/${campaign.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  function handleAddCredentials(channelType: ChannelType) {
    const saved = (
      <CreateModal name={selectedName} channelType={selectedChannel} />
    )
    modalContext.setModalContent(
      <AddCredentialModal
        credType={channelType}
        onSuccess={() => modalContext.setModalContent(saved)}
      ></AddCredentialModal>
    )
  }

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.title}>Name your campaign</h2>
        <h5 className={styles.subtitle}>
          Give your campaign a descriptive name
        </h5>
        <TextInput
          className={styles.input}
          type="text"
          value={selectedName}
          onChange={setSelectedName}
        ></TextInput>
      </div>
      <div className={cx(styles.section, styles.separator)}>
        <h2 className={styles.title}>Choose the channel you want to send in</h2>
        <h5 className={styles.subtitle}>
          Choosing a channel is irreversible. If you would like to change
          channels halfway, you will have to restart. You may only edit your
          message or re-upload recipients list. Please proceed with caution.
        </h5>

        <div className={styles.channelTypes}>
          <div>
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

            {selectedChannel === ChannelType.SMS && (
              <p className={styles.subtext}>
                Get your credentials ready.&nbsp;
                <OutboundLink
                  eventLabel={GUIDE_SMS_CREDENTIALS_URL}
                  to={GUIDE_SMS_CREDENTIALS_URL}
                  target="_blank"
                >
                  What is this?
                </OutboundLink>
              </p>
            )}
          </div>
          <div>
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
            {selectedChannel === ChannelType.Telegram && (
              <p className={styles.subtext}>
                It is best to&nbsp;
                <a onClick={() => handleAddCredentials(ChannelType.Telegram)}>
                  store and validate your credentials
                </a>
                &nbsp;before you start.
              </p>
            )}
          </div>
          <div>
            <PrimaryButton
              className={cx(styles.button, {
                [styles.active]: selectedChannel === ChannelType.Email,
              })}
              onClick={() => setSelectedChannel(ChannelType.Email)}
            >
              Email
              <i
                className={cx(
                  'bx',
                  styles.icon,
                  channelIcons[ChannelType.Email]
                )}
              ></i>
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="separator"></div>
      <div className="progress-button">
        <PrimaryButton
          className={styles.bottomButton}
          onClick={handleCreateCampaign}
          disabled={!selectedName}
        >
          Create campaign
          <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
        </PrimaryButton>
      </div>
    </>
  )
}

export default CreateModal
