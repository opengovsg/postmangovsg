import React, { useState, useContext } from 'react'
import { OutboundLink } from 'react-ga'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'

import { LINKS } from 'config'
import { ChannelType, channelIcons, Campaign } from 'classes/Campaign'
import {
  TextInput,
  PrimaryButton,
  Checkbox,
  ErrorBlock,
} from 'components/common'
import styles from './DuplicateCampaignModal.module.scss'
import { duplicateCampaign } from 'services/campaign.service'
import { ModalContext } from 'contexts/modal.context'

import { i18n } from 'locales'

const DuplicateCampaignModal = ({ campaign }: { campaign: Campaign }) => {
  const { close } = useContext(ModalContext)
  const history = useHistory()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedName, setSelectedName] = useState(`Copy of ${campaign.name}`)

  async function handleDuplicateCampaign() {
    try {
      const duplicate: Campaign = await duplicateCampaign({
        name: selectedName,
        campaignId: campaign.id,
      })
      // close modal and go to create view
      close()
      history.push(`/campaigns/${duplicate.id}`)
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message)
    }
  }

  return (
    <>
      <div className={styles.content}>
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
                  [styles.active]: campaign.type === ChannelType.SMS,
                })}
                disabled={true}
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
            </div>
            <div className={styles.channelContainer}>
              <PrimaryButton
                className={cx(styles.button, {
                  [styles.active]: campaign.type === ChannelType.Telegram,
                })}
                disabled={true}
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
            <div className={styles.channelContainer}>
              <PrimaryButton
                className={cx(styles.button, {
                  [styles.active]: campaign.type === ChannelType.Email,
                })}
                disabled={true}
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
              {campaign.type === ChannelType.Email && (
                <Checkbox
                  className={cx(styles.protectedOption, styles.disabled)}
                  checked={campaign.protect}
                  // eslint-disable-next-line @typescript-eslint/no-empty-function
                  onChange={() => {}}
                >
                  <p className={styles.subtext}>
                    Password protected.
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
            onClick={handleDuplicateCampaign}
            disabled={!selectedName}
          >
            Duplicate campaign
            <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
          </PrimaryButton>
        </div>
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </div>
    </>
  )
}

export default DuplicateCampaignModal
