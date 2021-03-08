import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { Status, CampaignStats, ChannelType } from 'classes/Campaign'
import {
  getCampaignStats,
  stopCampaign,
  retryCampaign,
} from 'services/campaign.service'
import { StepHeader, ProgressDetails } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import CompletedDemoModal from 'components/dashboard/demo/completed-demo-modal'

const TelegramDetail = () => {
  const { setModalContent } = useContext(ModalContext) // Destructured to avoid the addition of modalContext to useEffect's dependencies
  const { campaign } = useContext(CampaignContext)
  const { id, demoMessageLimit } = campaign
  const isDemo = !!demoMessageLimit
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
      sendUserEvent(GA_USER_EVENTS.PAUSE_SENDING, ChannelType.Telegram)
      await stopCampaign(id)
      await refreshCampaignStats(id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRetry() {
    try {
      sendUserEvent(GA_USER_EVENTS.RETRY_RESUME_SENDING, ChannelType.Telegram)
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

  useEffect(() => {
    function renderCompletedDemoModal() {
      setModalContent(
        <CompletedDemoModal
          selectedChannel={ChannelType.Telegram}
        ></CompletedDemoModal>
      )
    }
    if (isDemo && stats.status === Status.Sent) renderCompletedDemoModal()
  }, [isDemo, setModalContent, stats.status])

  function renderProgressHeader() {
    if (stats.waitTime && stats.waitTime > 0) {
      const waitMin = Math.ceil(stats.waitTime / 60)
      return (
        <StepHeader title="Other campaigns are queued ahead of this campaign.">
          <p>
            Your campaign should start in approximately{' '}
            <b>{waitMin > 1 ? `${waitMin} minutes` : `${waitMin} minute`}</b>.
            You can leave this page in the meantime, and check on the progress
            by returning to this page from the Campaigns tab.
          </p>
        </StepHeader>
      )
    } else if (stats.status === Status.Sending) {
      return (
        <StepHeader title="Your campaign is being sent out now!">
          <p>
            It may take some time to complete. You can leave this page in the
            meantime, and check on the progress by returning to this page from
            the Campaigns tab.
          </p>
        </StepHeader>
      )
    } else {
      return (
        <StepHeader title="Your campaign has been sent!">
          <p>
            If there are errors with sending your messages, you can click Retry
            to send again.
          </p>
          <p>
            An export button will appear for you to download a report with the
            recipient’s mobile number and delivery status when it is ready.
          </p>
        </StepHeader>
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
            redacted={campaign.redacted}
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

export default TelegramDetail
