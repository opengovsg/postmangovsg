import React, { useEffect, useState, useRef } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import cx from 'classnames'

import {
  Campaign,
  ChannelType,
  SMSCampaign,
  EmailCampaign,
  TelegramCampaign,
  Status,
} from 'classes'
import { TitleBar, PrimaryButton } from 'components/common'
import { getCampaignDetails } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import SMSCreate from './sms/SMSCreate'
import EmailCreate from './email/EmailCreate'
import TelegramCreate from './telegram/TelegramCreate'
import styles from './Create.module.scss'

const Create = () => {
  const { id } = useParams()
  const history = useHistory()

  const [campaign, setCampaign] = useState(new Campaign({}))
  const [isLoading, setLoading] = useState(true)
  const finishLaterCallbackRef: React.MutableRefObject<
    (() => void) | undefined
  > = useRef()

  async function loadProject(id: string) {
    const campaign = await getCampaignDetails(+id)
    setCampaign(campaign)
    setLoading(false)
  }

  useEffect(() => {
    if (!id) return
    loadProject(id)
  }, [id])

  async function handleFinishLater() {
    if (campaign.status === Status.Draft) {
      sendUserEvent(GA_USER_EVENTS.FINISH_CAMPAIGN_LATER, campaign.type)

      if (finishLaterCallbackRef.current) {
        return finishLaterCallbackRef.current()
      }
    }
    history.push('/campaigns')
  }

  function renderCreateChannel() {
    switch (campaign.type) {
      case ChannelType.SMS:
        return (
          <SMSCreate
            campaign={campaign as SMSCampaign}
            onCampaignChange={setCampaign}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      case ChannelType.Email:
        return (
          <EmailCreate
            campaign={campaign as EmailCampaign}
            onCampaignChange={setCampaign}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      case ChannelType.Telegram:
        return (
          <TelegramCreate
            campaign={campaign as TelegramCampaign}
            onCampaignChange={setCampaign}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      default:
        return <p>Invalid Channel Type</p>
    }
  }

  return (
    <>
      {campaign ? (
        <>
          <TitleBar title={campaign.name}>
            <PrimaryButton onClick={handleFinishLater}>
              {campaign.status === Status.Draft
                ? 'Finish this later'
                : 'Back to campaigns'}
            </PrimaryButton>
          </TitleBar>
          {isLoading ? (
            <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')}></i>
          ) : (
            renderCreateChannel()
          )}
        </>
      ) : (
        <p>loading..</p>
      )}
    </>
  )
}

export default Create
