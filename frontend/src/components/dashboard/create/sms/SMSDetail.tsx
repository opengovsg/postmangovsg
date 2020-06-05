import React, { useState, useEffect } from 'react'

import { Status, CampaignStats, ChannelType } from 'classes/Campaign'
import {
  getCampaignStats,
  stopCampaign,
  retryCampaign,
} from 'services/campaign.service'
import { ProgressDetails } from 'components/common'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const SMSDetail = ({
  id,
  name,
  sentAt,
  numRecipients,
}: {
  id: number
  name: string
  sentAt: Date
  numRecipients: number
}) => {
  const [stats, setStats] = useState(new CampaignStats({}))

  async function refreshCampaignStats(id: number) {
    const campaignStats = await getCampaignStats(id)
    setStats(campaignStats)
    return campaignStats
  }

  async function handlePause() {
    try {
      sendUserEvent(GA_USER_EVENTS.PAUSE_SENDING, ChannelType.SMS)
      await stopCampaign(id)
      await refreshCampaignStats(id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRetry() {
    try {
      sendUserEvent(GA_USER_EVENTS.RETRY_RESUME_SENDING, ChannelType.SMS)
      await retryCampaign(id)
      await refreshCampaignStats(id)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function poll() {
      const { status } = await refreshCampaignStats(id)

      if (status !== Status.Sent) {
        timeoutId = setTimeout(poll, 2000)
      }
    }

    poll()
    return () => {
      timeoutId && clearTimeout(timeoutId)
    }
  }, [id, stats.status])

  return (
    <>
      {stats.status === Status.Sending ? (
        <>
          <h2>Your campaign is being sent out now!</h2>
          <p>
            It may take a few minutes to complete. You can leave this page in
            the meantime, and check on the progress by returning to this page
            from the Campaigns tab.
          </p>
        </>
      ) : (
        <>
          <h2>Your campaign has been sent!</h2>
          <p>
            Some messages may have failed to send. You can retry these by
            clicking on Retry.{' '}
          </p>
        </>
      )}

      <div className="separator"></div>

      {stats.status && (
        <ProgressDetails
          campaignId={id}
          campaignName={name}
          sentAt={sentAt}
          numRecipients={numRecipients}
          stats={stats}
          handlePause={handlePause}
          handleRetry={handleRetry}
        />
      )}
    </>
  )
}

export default SMSDetail
