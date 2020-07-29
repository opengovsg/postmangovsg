import React, { useState, useContext, useEffect } from 'react'
import { OutboundLink } from 'react-ga'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'

import { LINKS } from 'config'
import { ChannelType, channelIcons, Campaign } from 'classes/Campaign'
import { TextInput, PrimaryButton, Checkbox } from 'components/common'
import styles from './CreateModal.module.scss'
import { createCampaign } from 'services/campaign.service'
import { ModalContext } from 'contexts/modal.context'

import AddCredentialModal from 'components/dashboard/settings/add-credential-modal'

import { i18n } from 'locales'

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
  const [protect, setProtected] = useState(false)

  useEffect(() => {
    setProtected(false)
  }, [selectedChannel])

  async function handleCreateCampaign() {
    try {
      const campaign: Campaign = await createCampaign(
        selectedName,
        selectedChannel,
        protect
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

            {selectedChannel === ChannelType.SMS && (
              <p className={styles.subtext}>
                Get your credentials ready.&nbsp;
                <OutboundLink
                  className={styles.link}
                  eventLabel={i18n._(LINKS.guideSmsUrl)}
                  to={i18n._(LINKS.guideSmsUrl)}
                  target="_blank"
                >
                  What is this?
                </OutboundLink>
              </p>
            )}
          </div>
          <div className={styles.channelContainer}>
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
                It is best to
                <span
                  className={styles.link}
                  onClick={() => handleAddCredentials(ChannelType.Telegram)}
                >
                  store and validate your credentials
                </span>
                &nbsp;before you start.
              </p>
            )}
          </div>
          <div className={styles.channelContainer}>
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
            {selectedChannel === ChannelType.Email && (
              <Checkbox
                className={styles.protectedOption}
                checked={protect}
                onChange={setProtected}
              >
                <p className={styles.subtext}>
                  Password protected.
                  {/* TODO: change url to passsword protected section in guide */}
                  <OutboundLink
                    className={styles.link}
                    eventLabel={i18n._(LINKS.guideUrl)}
                    to={i18n._(LINKS.guideUrl)}
                    target="_blank"
                  >
                    Learn more
                  </OutboundLink>
                </p>
              </Checkbox>
            )}
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
