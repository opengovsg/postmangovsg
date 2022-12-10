// eslint-disable-next-line import/order
import { useContext } from 'react'

import { EmailCampaign } from 'classes'

import { ChannelType, Status } from 'classes/Campaign'
import {
  EmailPreviewBlock,
  ProgressDetails,
  StepHeader,
} from 'components/common'
import CampaignScheduledInfo from 'components/common/CampaignScheduledInfo'
import ScheduleDetails from 'components/common/schedule-details'
import usePollCampaignStats from 'components/custom-hooks/use-poll-campaign-stats'
import { CampaignContext } from 'contexts/campaign.context'

import { retryCampaign, stopCampaign } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const EmailDetail = () => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { id } = campaign
  const { stats, refreshCampaignStats } = usePollCampaignStats()

  const emailCampaign = campaign as EmailCampaign

  async function handlePause() {
    try {
      sendUserEvent(GA_USER_EVENTS.PAUSE_SENDING, ChannelType.Email)
      await stopCampaign(id)
      await refreshCampaignStats()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRetry() {
    try {
      sendUserEvent(GA_USER_EVENTS.RETRY_RESUME_SENDING, ChannelType.Email)
      await retryCampaign(id)
      await refreshCampaignStats()
    } catch (err) {
      console.error(err)
    }
  }

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
    } else if (campaign.status === Status.Scheduled) {
      return (
        <CampaignScheduledInfo
          campaign={campaign}
          updateCampaign={updateCampaign}
        />
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
            recipient’s email address and delivery status when it is ready.
          </p>
        </StepHeader>
      )
    }
  }

  function renderProgressDetails() {
    return (
      <>
        <div className="separator"></div>
        <h3>Email Template</h3>
        <EmailPreviewBlock
          body={emailCampaign.body}
          themedBody={emailCampaign.themedBody}
          subject={emailCampaign.subject}
          replyTo={emailCampaign.replyTo}
          from={emailCampaign.from}
        />
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

export default EmailDetail
