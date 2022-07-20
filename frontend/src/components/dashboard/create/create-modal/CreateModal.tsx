import { i18n } from '@lingui/core'

import cx from 'classnames'

import { useState, useContext, useEffect } from 'react'

import { OutboundLink } from 'react-ga'

import { useHistory } from 'react-router-dom'

import styles from './CreateModal.module.scss'

import { ChannelType, channelIcons, Campaign } from 'classes/Campaign'
import {
  TextInput,
  PrimaryButton,
  Checkbox,
  ErrorBlock,
} from 'components/common'
import AddCredentialModal from 'components/dashboard/settings/add-credential-modal'
import { LINKS } from 'config'
import { ModalContext } from 'contexts/modal.context'

import { createCampaign } from 'services/campaign.service'

const CreateModal = ({
  name = '',
  channelType = ChannelType.SMS,
}: {
  name?: string
  channelType?: ChannelType
}) => {
  const modalContext = useContext(ModalContext)
  const history = useHistory()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedChannel, setSelectedChannel] = useState(channelType)
  const [selectedName, setSelectedName] = useState(name)
  const [protect, setProtected] = useState(false)

  useEffect(() => {
    setProtected(false)
  }, [selectedChannel])

  async function handleCreateCampaign() {
    try {
      const campaign: Campaign = await createCampaign({
        name: selectedName,
        type: selectedChannel,
        protect,
      })
      // close modal and go to create view
      modalContext.close()
      history.push(`/campaigns/${campaign.id}`)
    } catch (err) {
      console.error(err)
      setErrorMessage((err as Error).message)
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
      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.title}>
            <label htmlFor="nameCampaign">Name your campaign</label>
          </h2>
          <h5 className={styles.subtitle}>
            <label>Give your campaign a descriptive name</label>
          </h5>
          <TextInput
            id="nameCampaign"
            className={styles.input}
            type="text"
            value={selectedName}
            onChange={setSelectedName}
          ></TextInput>
        </div>
        <div className={cx(styles.section, styles.separator)}>
          <h2 className={styles.title}>
            Choose the channel you want to send in
          </h2>
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
                onClick={
                  selectedChannel === ChannelType.SMS
                    ? undefined
                    : () => setSelectedChannel(ChannelType.SMS)
                }
              >
                SMS
                <i
                  className={cx(
                    'bx',
                    styles.icon,
                    channelIcons[ChannelType.SMS]
                  )}
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
                onClick={
                  selectedChannel === ChannelType.Email
                    ? undefined
                    : () => setSelectedChannel(ChannelType.Email)
                }
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
                      eventLabel={i18n._(LINKS.guideEmailPasswordProtectedUrl)}
                      to={i18n._(LINKS.guideEmailPasswordProtectedUrl)}
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
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </div>
    </>
  )
}

export default CreateModal
