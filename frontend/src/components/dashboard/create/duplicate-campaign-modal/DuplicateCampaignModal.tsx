import { i18n } from '@lingui/core'

import cx from 'classnames'

import { useContext, useState } from 'react'

import { OutboundLink } from 'react-ga'

import { useNavigate } from 'react-router-dom'

import styles from './DuplicateCampaignModal.module.scss'

import { Campaign, ChannelType } from 'classes/Campaign'
import { ErrorBlock, PrimaryButton, TextInput } from 'components/common'
import { LINKS } from 'config'
import { AuthContext } from 'contexts/auth.context'
import { ModalContext } from 'contexts/modal.context'

import { duplicateCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const DuplicateCampaignModal = ({ campaign }: { campaign: Campaign }) => {
  const { close } = useContext(ModalContext)
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedName, setSelectedName] = useState(
    // Only prepend 'Copy of' if the campaign name doesn't already have one
    (campaign.name.startsWith('Copy of') ? '' : 'Copy of ') + campaign.name
  )
  const { experimentalData } = useContext(AuthContext)
  const canAccessGovsg = !!experimentalData[ChannelType.Govsg]

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
            Choosing a channel is irreversible for a given campaign. If you
            would like to change channels, you will have to create a new
            campaign.
          </h5>

          <div className={styles.channelTypes}>
            <div className={styles.channelContainer}>
              <input
                type="radio"
                aria-label={ChannelType.Email}
                id={ChannelType.Email}
                value={ChannelType.Email}
                checked={
                  campaign.type === ChannelType.Email && !campaign.protect
                }
                disabled={true}
              />
              <label htmlFor={ChannelType.Email} className={styles.subtext}>
                Email
              </label>
              {campaign.type === ChannelType.Email && !campaign.protect && (
                <p className={styles.infotext}>
                  <OutboundLink
                    className={styles.link}
                    eventLabel="https://go.gov.sg/postman-email"
                    to="https://go.gov.sg/postman-email"
                    target="_blank"
                  >
                    Learn more
                  </OutboundLink>
                  &nbsp; about sending emails on Postman.
                </p>
              )}
            </div>
            <div className={styles.channelContainer}>
              <input
                type="radio"
                aria-label={`protect-${ChannelType.Email}`}
                id={`protect-${ChannelType.Email}`}
                value={ChannelType.Email}
                checked={
                  campaign.type === ChannelType.Email && campaign.protect
                }
                disabled={true}
              />
              <label
                htmlFor={`protect-${ChannelType.Email}`}
                className={styles.subtext}
              >
                Password Protected Email
              </label>
              {campaign.type === ChannelType.Email && campaign.protect && (
                <p className={styles.infotext}>
                  Send sensitive content using Postman. &nbsp;
                  <OutboundLink
                    className={styles.link}
                    eventLabel={i18n._(LINKS.guideEmailPasswordProtectedUrl)}
                    to={i18n._(LINKS.guideEmailPasswordProtectedUrl)}
                    target="_blank"
                  >
                    Learn more.
                  </OutboundLink>
                </p>
              )}
            </div>
            <div className={styles.channelContainer}>
              <input
                type="radio"
                aria-label={ChannelType.SMS}
                id={ChannelType.SMS}
                value={ChannelType.SMS}
                checked={campaign.type === ChannelType.SMS}
                disabled={true}
              />
              <label htmlFor={ChannelType.SMS} className={styles.subtext}>
                SMS
              </label>
              {campaign.type === ChannelType.SMS && (
                <p className={styles.infotext}>
                  Set up your Twilio credentials. &nbsp;
                  <OutboundLink
                    className={styles.link}
                    eventLabel={i18n._(LINKS.guideSmsUrl)}
                    to={i18n._(LINKS.guideSmsUrl)}
                    target="_blank"
                  >
                    Learn more.
                  </OutboundLink>
                </p>
              )}
            </div>
            {canAccessGovsg && (
              <div className={styles.channelContainer}>
                <input
                  type="radio"
                  aria-label={ChannelType.Govsg}
                  id={ChannelType.Govsg}
                  value={ChannelType.Govsg}
                  checked={campaign.type === ChannelType.Govsg}
                  disabled
                />
                <label htmlFor={ChannelType.Govsg} className={styles.subtext}>
                  Gov.sg WhatsApp
                </label>
                {campaign.type === ChannelType.Govsg && (
                  <p className={styles.infotext}>
                    Send WhatsApp messages from a verified Gov.sg account
                  </p>
                )}
              </div>
            )}
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
