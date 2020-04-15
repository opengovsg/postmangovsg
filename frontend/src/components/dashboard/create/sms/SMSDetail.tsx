import React, { useState, useEffect } from 'react'

import { Status, CampaignStats } from 'classes/Campaign'
import { getCampaignStats } from 'services/campaign.service'
import { ProgressDetails } from 'components/common'

const SMSDetail = ({ id, sentAt, numRecipients }: { id: number; sentAt: Date; numRecipients: number }) => {

  const [stats, setStats] = useState(new CampaignStats({
  }))

  async function refreshCampaignStats() {
    const campaignStats = await getCampaignStats(+id)
    setStats(campaignStats)
  }

  async function pollSendingStatus() {
    await refreshCampaignStats()
    if (stats.status !== Status.Sent) {
      setTimeout(() => {
        pollSendingStatus()
      }, 1000)
    }
  }

  useEffect(() => {
    pollSendingStatus()
  }, [])

  return (
    <>
      <h2>Your campaign is being sent out now!</h2>
      <p>It may take a few minutes to complete. You can leave this page in the meantime,
        and check on the progress at home page. For SMSes which have errored, you will be
        notified at home page and you can retry sending them.</p>

      <div className="separator"></div>

      <ProgressDetails sentAt={sentAt} numRecipients={numRecipients} stats={stats} />
    </>
  )
}

export default SMSDetail
