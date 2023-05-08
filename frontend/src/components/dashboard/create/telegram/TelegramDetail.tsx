import { useContext, useEffect } from 'react'

import { ChannelType, Status } from 'classes/Campaign'
import { PreviewBlock, ProgressDetails, StepHeader } from 'components/common'
import CampaignScheduledInfo from 'components/common/CampaignScheduledInfo'
import ScheduleDetails from 'components/common/schedule-details'
import usePollCampaignStats from 'components/custom-hooks/use-poll-campaign-stats'
import CompletedDemoModal from 'components/dashboard/demo/completed-demo-modal'
import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'

import { retryCampaign, stopCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const TelegramDetail = () => {
  const { setModalContent } = useContext(ModalContext) // Destructured to avoid the addition of modalContext to useEffect's dependencies
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { id, demoMessageLimit } = campaign
  const isDemo = !!demoMessageLimit
  const { stats, refreshCampaignStats } = usePollCampaignStats()

  async function handlePause() {
    try {
      sendUserEvent(GA_USER_EVENTS.PAUSE_SENDING, ChannelType.Telegram)
      await stopCampaign(id)
      await refreshCampaignStats()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRetry() {
    try {
      sendUserEvent(GA_USER_EVENTS.RETRY_RESUME_SENDING, ChannelType.Telegram)
      await retryCampaign(id)
      await refreshCampaignStats()
    } catch (err) {
      console.error(err)
    }
  }

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
    if (campaign.status === Status.Scheduled) {
      return (
        <CampaignScheduledInfo
          campaign={campaign}
          updateCampaign={updateCampaign}
        />
      )
    } else if (stats.waitTime && stats.waitTime > 0) {
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
        <h3>Message Template</h3>
        <PreviewBlock body={campaign.body} />
        <div className="separator"></div>
        {stats.status && campaign.status !== Status.Scheduled && (
          <ProgressDetails
            stats={stats}
            redacted={campaign.redacted}
            handlePause={handlePause}
            handleRetry={handleRetry}
          />
        )}
        {campaign.status === Status.Scheduled && (
          <ScheduleDetails
            scheduledAt={campaign.scheduledAt as Date}
            messageNumber={campaign.numRecipients}
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
