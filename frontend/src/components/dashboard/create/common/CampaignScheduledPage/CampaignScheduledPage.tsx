import { useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'

const CampaignScheduledPage = () => {
  const { campaign } = useContext(CampaignContext)

  return <>{campaign.status}</>
}

export default CampaignScheduledPage
