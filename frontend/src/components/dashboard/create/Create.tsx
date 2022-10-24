import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChannelType, Status } from 'classes'
import cx from 'classnames'
import { PrimaryButton, TitleBar } from 'components/common'
import DemoInfoBanner from 'components/dashboard/demo/demo-info-banner/DemoInfoBanner'
import Error from 'components/error'
import { CampaignContext } from 'contexts/campaign.context'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'
import { getCampaignDetails } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

import EmailCreate from './email/EmailCreate'
import SMSCreate from './sms/SMSCreate'
import TelegramCreate from './telegram/TelegramCreate'
import styles from './Create.module.scss'

const Create = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { campaign, setCampaign } = useContext(CampaignContext)
  const { handleFinishLater: finishLaterContextHandler, finishLaterContent } =
    useContext(FinishLaterModalContext)
  const [isLoading, setLoading] = useState(true)
  const [isInvalid, setIsInvalid] = useState(false)

  useEffect(() => {
    // Campaign ID is invalid
    if (!id || !/^[1-9]\d*$/.test(id)) {
      setIsInvalid(true)
      return
    }

    async function loadProject(id: string) {
      try {
        const campaign = await getCampaignDetails(+id)
        setCampaign(campaign)
        setLoading(false)
      } catch (err) {
        // Campaign is invalid
        setIsInvalid(true)
      }
    }
    void loadProject(id)
  }, [id, setCampaign, setIsInvalid])

  async function handleFinishLater() {
    if (campaign.status === Status.Draft) {
      sendUserEvent(GA_USER_EVENTS.FINISH_CAMPAIGN_LATER, campaign.type)
      if (finishLaterContent) return finishLaterContextHandler()
    }
    navigate('/campaigns')
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

  if (isInvalid) {
    return <Error />
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
