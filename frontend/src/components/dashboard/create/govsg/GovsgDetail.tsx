import cx from 'classnames'

import { useContext } from 'react'

import styles from '../Create.module.scss'

import { GovsgMessages } from './GovsgMessages'

import { Status } from 'classes'
import { PreviewBlock, ProgressDetails, StepHeader } from 'components/common'
import CampaignScheduledInfo from 'components/common/CampaignScheduledInfo/CampaignScheduledInfo'
import ScheduleDetails from 'components/common/schedule-details/ScheduleDetails'
import usePollCampaignStats from 'components/custom-hooks/use-poll-campaign-stats'
import { CampaignContext } from 'contexts/campaign.context'
import { GovsgDetailContext } from 'contexts/govsg-detail.context'
import { retryCampaign } from 'services/campaign.service'

const GovsgDetail = () => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { activeTab } = useContext(GovsgDetailContext)
  const { stats, refreshCampaignStats } = usePollCampaignStats()

  async function handleRetry() {
    try {
      await retryCampaign(campaign.id)
      await refreshCampaignStats()
    } catch (err) {
      console.error(err)
    }
  }

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
        {stats.status && campaign.status !== Status.Scheduled && (
          <ProgressDetails
            stats={stats}
            redacted={campaign.redacted}
            handleRetry={handleRetry}
          />
        )}
        {campaign.status === Status.Scheduled && (
          <ScheduleDetails
            scheduledAt={campaign.scheduledAt as Date}
            messageNumber={campaign.numRecipients}
          />
        )}
        <div className="separator"></div>
        <h3>Template</h3>
        <PreviewBlock body={campaign.body} richPreview hideHeaders />
      </>
    )
  }

  return (
    <>
      {activeTab === 0 && (
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
          {renderProgressHeader()}
          {renderProgressDetails()}
        </div>
      )}
      {activeTab === 1 && <GovsgMessages />}
    </>
  )
}

export default GovsgDetail
