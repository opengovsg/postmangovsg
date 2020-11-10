import React from 'react'
import Moment from 'react-moment'
import cx from 'classnames'

import { ChannelType, CampaignStats, Status } from 'classes/Campaign'
import {
  ProgressBar,
  PrimaryButton,
  ExportRecipients,
  InfoBlock,
} from 'components/common'
import styles from './ProgressDetails.module.scss'
import { OutboundLink } from 'react-ga'
import { LINKS } from 'config'
import { i18n } from 'locales'
import { Trans } from '@lingui/macro'

const ProgressDetails = ({
  campaignId,
  campaignName,
  campaignType,
  sentAt,
  numRecipients,
  stats,
  redacted,
  handlePause,
  handleRetry,
  handleRefreshStats,
}: {
  campaignId: number
  campaignName: string
  campaignType: ChannelType
  sentAt: Date
  numRecipients: number
  stats: CampaignStats
  redacted: boolean
  handlePause: () => Promise<void>
  handleRetry: () => Promise<void>
  handleRefreshStats: () => Promise<void>
}) => {
  const {
    status,
    statusUpdatedAt,
    error,
    unsent,
    sent,
    invalid,
    updatedAt,
    halted,
  } = stats

  const isSent = status === Status.Sent
  const isComplete = !error && !unsent
  const isHalted = !!halted

  function renderButton() {
    if (isHalted) {
      return (
        <span>
          Too many of your emails bounced.{' '}
          <OutboundLink
            eventLabel={i18n._(LINKS.contactUsUrl)}
            to={i18n._(LINKS.contactUsUrl)}
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

  function renderUpdateStats() {
    if (isSent) {
      return (
        <div className={styles.statsLastUpdated}>
          <span>
            Stats last retrieved on <Moment format="LLL">{updatedAt}</Moment>
          </span>
          <PrimaryButton onClick={handleRefreshStats}>
            Refresh stats
          </PrimaryButton>
        </div>
      )
    }
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

      {!redacted ? (
        <ExportRecipients
          iconPosition="right"
          campaignId={campaignId}
          campaignName={campaignName}
          campaignType={campaignType}
          sentAt={sentAt}
          status={status}
          statusUpdatedAt={statusUpdatedAt}
          isButton
        />
      ) : (
        <InfoBlock className={styles.notice}>
          <Trans>
            Delivery report has expired and is no longer available for download.
          </Trans>
        </InfoBlock>
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
      {renderUpdateStats()}
    </div>
  )
}

export default ProgressDetails
