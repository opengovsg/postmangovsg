import React, { useEffect, useState } from 'react'

import { TitleBar } from 'components/common'
import { getCampaignDetails } from 'services/campaigns.service'
import { Campaign, SMSCampaign } from 'classes'

import EditSMS from './EditSMS'

const Edit = () => {

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
        <EditSMS campaign={campaign}></EditSMS>
      </>
    )
  }
  return <p>loading..</p>
}

export default Edit