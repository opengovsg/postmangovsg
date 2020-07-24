import React, { useState, useEffect } from 'react'
import Moment from 'react-moment'
import cx from 'classnames'

import {
  getExportStatus,
  CampaignExportStatus,
} from 'services/campaign.service'
import { CampaignStats, Status } from 'classes/Campaign'
import {
  ProgressBar,
  PrimaryButton,
  ExportRecipients,
  ActionButton,
} from 'components/common'
import styles from './ProgressDetails.module.scss'
import { OutboundLink } from 'react-ga'
import { CONTACT_US_URL } from 'config'
const ProgressDetails = ({
  campaignId,
  campaignName,
  sentAt,
  numRecipients,
  stats,
  handlePause,
  handleRetry,
}: {
  campaignId: number
  campaignName: string
  sentAt: Date
  numRecipients: number
  stats: CampaignStats
  handlePause: () => Promise<void>
  handleRetry: () => Promise<void>
}) => {
  const { status, error, unsent, sent, invalid, updatedAt, halted } = stats
  const [isSent, setIsSent] = useState(status === Status.Sent)
  const [isComplete, setIsComplete] = useState(!error && !unsent)
  const [exportStatus, setExportStatus] = useState(CampaignExportStatus.Loading)
  const [isHalted, setIsHalted] = useState(!!halted)

  useEffect(() => {
    setIsComplete(!error && !unsent)
    setIsSent(status === Status.Sent)
    setIsHalted(!!halted)
  }, [status, error, unsent, halted])

  useEffect(() => {
    async function checkHasExportButton() {
      const failedCount = error + invalid
      const exportStatus = getExportStatus(status, updatedAt, failedCount)
      setExportStatus(exportStatus)
    }
    checkHasExportButton()
  }, [status, updatedAt, error, invalid])

  function renderButton() {
    if (isHalted) {
      return (
        <span>
          Too many of your emails bounced.{' '}
          <OutboundLink
            eventLabel={CONTACT_US_URL}
            to={CONTACT_US_URL}
            target="_blank"
          >
            Contact us
          </OutboundLink>{' '}
          for details.
        </span>
      )
    }

    if (!isSent) {
      return (
        <PrimaryButton className={styles.pause} onClick={handlePause}>
          Pause sending
          <i className={cx(styles.icon, 'bx bx-error-circle')}></i>
        </PrimaryButton>
      )
    }
    if (!isComplete) {
      return (
        <PrimaryButton className={styles.retry} onClick={handleRetry}>
          Retry/Resume sending
          <i className={cx(styles.icon, 'bx bx-revision')}></i>
        </PrimaryButton>
      )
    }

    return null
  }

  function renderProgressTitle() {
    let progressMessage = null
    if (isHalted) {
      progressMessage = 'Halted'
    } else if (isComplete) {
      progressMessage = 'Sending completed'
    } else {
      progressMessage = 'Progress'
    }
    return <h2>{progressMessage}</h2>
  }

  return (
    <div className={styles.progress}>
      <table>
        <thead>
          <tr>
            <th className={'md'}>Sent date</th>
            <th className={'md'}>Total messages</th>
            <th className={'sm'}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={'md'}>
              <Moment format="LLL">{sentAt}</Moment>
            </td>

            <td className={'md'}>{numRecipients}</td>
            <td className={'sm'}>{status}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.progressTitle}>
        {renderProgressTitle()}
        {renderButton()}
      </div>
      <ProgressBar
        progress={numRecipients - unsent}
        total={numRecipients}
        isComplete={isComplete}
      />

      {exportStatus && (
        <div className={styles.actionButton}>
          <ActionButton
            className={cx(
              {
                [styles.disabledExport]:
                  exportStatus === CampaignExportStatus.NoError ||
                  exportStatus === CampaignExportStatus.Unavailable,
              },
              {
                [styles.disablePointerEvents]:
                  exportStatus !== CampaignExportStatus.Ready,
              }
            )}
          >
            <ExportRecipients
              iconPosition="right"
              campaignId={campaignId}
              campaignName={campaignName}
              status={status}
              sentAt={sentAt}
              exportStatus={exportStatus}
            />
          </ActionButton>
        </div>
      )}

      <table className={styles.stats}>
        <thead>
          <tr>
            <th className={'md'}>Status</th>
            <th className={'md'}>Description</th>
            <th className={'sm'}>Message count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cx(styles.status, 'md')}>
              <i
                className={cx(styles.icon, styles.red, 'bx bx-error-circle')}
              ></i>
              Error
            </td>
            <td className={'md'}>Could not be sent</td>
            <td className={'sm'}>{error}</td>
          </tr>
          <tr>
            <td className={cx(styles.status, 'md')}>
              <i
                className={cx(styles.icon, styles.blue, 'bx bx-time-five')}
              ></i>
              Unsent
            </td>
            <td className={'md'}>In the queue</td>
            <td className={'sm'}>{unsent}</td>
          </tr>
          <tr>
            <td className={cx(styles.status, 'md')}>
              <i
                className={cx(styles.icon, styles.green, 'bx bx-check-circle')}
              ></i>
              Sent
            </td>
            <td className={'md'}>Sent to recipient</td>
            <td className={'sm'}>{sent}</td>
          </tr>
          <tr>
            <td className={cx(styles.status, 'md')}>
              <i
                className={cx(styles.icon, styles.grey, 'bx bx-minus-circle')}
              ></i>
              Invalid
            </td>
            <td className={'md'}>Recipient does not exist</td>
            <td className={'sm'}>{invalid}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default ProgressDetails
