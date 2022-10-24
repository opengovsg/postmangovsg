import { useContext, useState } from 'react'
import { OutboundLink } from 'react-ga'
import { useNavigate } from 'react-router-dom'
import { i18n } from '@lingui/core'
import { Campaign, channelIcons, ChannelType } from 'classes/Campaign'
import cx from 'classnames'
import {
  Checkbox,
  ErrorBlock,
  PrimaryButton,
  TextInput,
} from 'components/common'
import { LINKS } from 'config'
import { ModalContext } from 'contexts/modal.context'
import { duplicateCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

import styles from './DuplicateCampaignModal.module.scss'

const DuplicateCampaignModal = ({ campaign }: { campaign: Campaign }) => {
  const { close } = useContext(ModalContext)
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedName, setSelectedName] = useState(
    // Only prepend 'Copy of' if the campaign name doesn't already have one
    (campaign.name.startsWith('Copy of') ? '' : 'Copy of ') + campaign.name
  )

  async function handleDuplicateCampaign() {
    try {
      const duplicate: Campaign = await duplicateCampaign({
        name: selectedName,
        campaignId: campaign.id,
      })
      sendUserEvent(GA_USER_EVENTS.COMPLETE_DUPLICATE, campaign.type)
      // close modal and go to create view
      close()
      navigate(`/campaigns/${duplicate.id}`)
    } catch (err) {
      console.error(err)
      setErrorMessage((err as Error).message)
    }
  }

  return (
    <>
      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.title}>
            <label htmlFor="nameCampaign">Name your campaign</label>
          </h2>
          <h5 className={styles.subtitle}>
            <label htmlFor="nameCampaign">
              Give your campaign a descriptive name
            </label>
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
                  <p className={cx(styles.subtext, styles.disabled)}>
                    Password protected.
                    <OutboundLink
                      className={cx(styles.link, styles.disabled)}
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
