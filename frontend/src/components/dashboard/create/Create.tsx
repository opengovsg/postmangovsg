import React, { useEffect, useState } from 'react'

import { TitleBar } from 'components/common'
import { getCampaignDetails } from 'services/campaign.service'
import { Campaign, SMSCampaign } from 'classes'

import SMSCreate from './sms/SMSCreate'

const Create = () => {

  const [campaign, setCampaign] = useState<Campaign | null>(null)

  async function loadCampaign() {
    const campaign = await getCampaignDetails(1)
    setCampaign(campaign)
  }

  useEffect(() => {
    loadCampaign()
  }, [])

  if (campaign && campaign instanceof SMSCampaign) {
    return (
      <>
        <TitleBar title={campaign.name}> </TitleBar>
        <SMSCreate campaign={campaign}></SMSCreate>
      </>
    )
  }
  return <p>loading..</p>
}

export default Create