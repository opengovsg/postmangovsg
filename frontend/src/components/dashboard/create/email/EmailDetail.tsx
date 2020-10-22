import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { Status, CampaignStats, ChannelType } from 'classes/Campaign'
import {
  getCampaignStats,
  stopCampaign,
  retryCampaign,
} from 'services/campaign.service'
import { ProgressDetails } from 'components/common'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const EmailDetail = () => {
  const { campaign } = useContext(CampaignContext)
  const { id } = campaign
  const [stats, setStats] = useState(new CampaignStats({}))

  async function refreshCampaignStats(id: number, forceRefresh = false) {
    const campaignStats = await getCampaignStats(id, forceRefresh)
    setStats(campaignStats)
    return campaignStats
  }

  async function handleRefreshStats() {
    try {
      await refreshCampaignStats(id, true)
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePause() {
    try {
      sendUserEvent(GA_USER_EVENTS.PAUSE_SENDING, ChannelType.Email)
      await stopCampaign(id)
      await refreshCampaignStats(id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRetry() {
    try {
      sendUserEvent(GA_USER_EVENTS.RETRY_RESUME_SENDING, ChannelType.Email)
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

  function renderProgressHeader() {
    if (stats.waitTime && stats.waitTime > 0) {
      const waitMin = Math.ceil(stats.waitTime / 60)
      return (
        <>
          <h2>Other campaigns are queued ahead of this campaign.</h2>
          <p>
            Your campaign should start in approximately{' '}
            <b>{waitMin > 1 ? `${waitMin} minutes` : `${waitMin} minute`}</b>.
            You can leave this page in the meantime, and check on the progress
            by returning to this page from the Campaigns tab.
          </p>
        </>
      )
    } else if (stats.status === Status.Sending) {
      return (
        <>
          <h2>Your campaign is being sent out now!</h2>
          <p>
            It may take some time to complete. You can leave this page in the
            meantime, and check on the progress by returning to this page from
            the Campaigns tab.
          </p>
        </>
      )
    } else {
      return (
        <>
          <h2>Your campaign has been sent!</h2>
          <p>
            If there are errors with sending your messages, you can click Retry
            to send again.
          </p>
          <p>
            An export button will appear for you to download a report with the
            recipient’s email address and delivery status when it is ready.
          </p>
        </>
      )
    }
  }

  function renderProgressDetails() {
    return (
      <>
        <div className="separator"></div>
        {stats.status && (
          <ProgressDetails
            stats={stats}
            handlePause={handlePause}
            handleRetry={handleRetry}
            handleRefreshStats={handleRefreshStats}
          />
        )}
      </>
    )
  }
  return (
    <>
      {renderProgressHeader()}
      {renderProgressDetails()}
    </>
  )
}

export default EmailDetail
