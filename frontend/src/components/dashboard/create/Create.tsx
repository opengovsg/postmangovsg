import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Campaign, ChannelType, SMSCampaign, EmailCampaign } from 'classes'
import { TitleBar } from 'components/common'
import { getCampaignDetails } from 'services/campaign.service'
import SMSCreate from './sms/SMSCreate'
import EmailCreate from './email/EmailCreate'

const Create = () => {
  const { id } = useParams()

  const [campaign, setCampaign] = useState(new Campaign({}))

  async function loadProject() {
    if (id) {
      const campaign = await getCampaignDetails(+id)
      setCampaign(campaign)
    }
  }

  useEffect(() => {
    loadProject()
  }, [])

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
      {
        campaign ?
          (
            <>
              <TitleBar title={campaign.name} > </TitleBar >
              {renderCreateChannel()}
            </>
          )
          :
          (<p>loading..</p>)
      }
    </>
  )
}

export default Create