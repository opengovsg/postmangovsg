import React, { useEffect, useState, useContext } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import cx from 'classnames'

import { CampaignContext } from 'contexts/campaign.context'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'
import { ChannelType, Status } from 'classes'
import { TitleBar, PrimaryButton } from 'components/common'
import DemoInfoBanner from 'components/dashboard/demo/demo-info-banner/DemoInfoBanner'
import { getCampaignDetails } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import SMSCreate from './sms/SMSCreate'
import EmailCreate from './email/EmailCreate'
import TelegramCreate from './telegram/TelegramCreate'
import styles from './Create.module.scss'

const Create = () => {
  const { id } = useParams()
  const history = useHistory()

  const { campaign, setCampaign } = useContext(CampaignContext)
  const {
    handleFinishLater: finishLaterContextHandler,
    finishLaterContent,
  } = useContext(FinishLaterModalContext)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function loadProject(id: string) {
      const campaign = await getCampaignDetails(+id)
      setCampaign(campaign)
      setLoading(false)
    }
    loadProject(id)
  }, [id, setCampaign])

  async function handleFinishLater() {
    sendUserEvent(GA_USER_EVENTS.FINISH_CAMPAIGN_LATER, campaign.type)
    if (campaign.status === Status.Draft && finishLaterContent) {
      finishLaterContextHandler()
    }
    history.push('/campaigns')
  }

  function renderCreateChannel() {
    switch (campaign.type) {
      case ChannelType.SMS:
        return <SMSCreate />
      case ChannelType.Email:
        return <EmailCreate />
      case ChannelType.Telegram:
        return <TelegramCreate />
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
          {!!campaign.demoMessageLimit && <DemoInfoBanner></DemoInfoBanner>}
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
