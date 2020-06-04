import React, { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import cx from 'classnames'

import {
  Campaign,
  ChannelType,
  SMSCampaign,
  EmailCampaign,
  Status,
} from 'classes'
import { TitleBar, PrimaryButton } from 'components/common'
import { getCampaignDetails } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import SMSCreate from './sms/SMSCreate'
import EmailCreate from './email/EmailCreate'
import styles from './Create.module.scss'

const Create = () => {
  const { id } = useParams()
  const history = useHistory()

  const [campaign, setCampaign] = useState(new Campaign({}))
  const [isLoading, setLoading] = useState(true)

  async function loadProject(id: string) {
    const campaign = await getCampaignDetails(+id)
    setCampaign(campaign)
    setLoading(false)
  }

  useEffect(() => {
    if (!id) return
    loadProject(id)
  }, [id])

  function renderCreateChannel() {
    switch (campaign.type) {
      case ChannelType.SMS:
        return <SMSCreate campaign={campaign as SMSCampaign} />
      case ChannelType.Email:
        return <EmailCreate campaign={campaign as EmailCampaign} />
      default:
        return <p>Invalid Channel Type</p>
    }
  }

  return (
    <>
      {campaign ? (
        <>
          <TitleBar title={campaign.name}>
            <PrimaryButton
              onClick={() => {
                if (campaign.status === Status.Draft) {
                  sendUserEvent(
                    GA_USER_EVENTS.FINISH_CAMPAIGN_LATER,
                    campaign.type
                  )
                }
                history.push('/campaigns')
              }}
            >
              {campaign.status === Status.Draft
                ? 'Finish this later'
                : 'Back to campaigns'}
            </PrimaryButton>
          </TitleBar>
          {isLoading && (
            <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')}></i>
          )}
          {!isLoading && renderCreateChannel()}
        </>
      ) : (
        <p>loading..</p>
      )}
    </>
  )
}

export default Create
