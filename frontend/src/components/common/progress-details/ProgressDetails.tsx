import { i18n } from '@lingui/core'

import cx from 'classnames'

import download from 'downloadjs'
import { useContext } from 'react'
import { OutboundLink } from 'react-ga'
import Moment from 'react-moment'

import styles from './ProgressDetails.module.scss'

import { CampaignStats, ChannelType, Status } from 'classes/Campaign'
import {
  ProgressBar,
  PrimaryButton,
  ExportRecipients,
  InfoBlock,
} from 'components/common'
import { LINKS } from 'config'
import { CampaignContext } from 'contexts/campaign.context'
import { exportEmailUnsubscribers } from 'services/campaign.service'

const ProgressDetails = ({
  stats,
  redacted,
  handlePause,
  handleRetry,
  handleRefreshStats,
}: {
  stats: CampaignStats
  redacted: boolean
  handlePause: () => Promise<void>
  handleRetry: () => Promise<void>
  handleRefreshStats: () => Promise<void>
}) => {
  const { campaign } = useContext(CampaignContext)
  const { id, name, type, sentAt, numRecipients } = campaign
  const {
    status,
    statusUpdatedAt,
    error,
    unsent,
    sent,
    invalid,
    updatedAt,
    halted,
    unsubscribed,
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
    return <h3>{progressMessage}</h3>
  }

  function renderUpdateStats() {
    if (isSent) {
      return (
        <div className={styles.statsLastUpdated}>
          <span>
            Stats last retrieved on{' '}
            <Moment format="LLL" interval={0}>
              {updatedAt}
            </Moment>
            .{' '}
            <span onClick={handleRefreshStats} className={styles.linkLike}>
              Refresh statistics
            </span>
          </span>
        </div>
      )
    }
  }

  async function exportUnsubscribers() {
    const list = await exportEmailUnsubscribers(id)

    const headers = ['Recipient', 'Reason', 'Unsubscribed At']
    const rows = list.map((r) => [r.recipient, r.reason, r.unsubscribedAt])
    const content = [headers, ...rows].map(toCsvRow).join('\n')
    const exportedAt = new Date()

    download(
      new Blob([content]),
      `${name}_unsubscribers_${exportedAt.toLocaleDateString()}_${exportedAt.toLocaleTimeString()}.csv`,
      'text/csv'
    )
  }
  function toCsvRow(data: string[]) {
    return data.map((d) => `"${d}"`).join(',')
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
              <Moment format="MMM DD YYYY, HH:mm" interval={0}>
                {sentAt}
              </Moment>
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
          campaignId={id}
          campaignName={name}
          campaignType={type}
          sentAt={sentAt}
          iconPosition="right"
          status={status}
          statusUpdatedAt={statusUpdatedAt}
          isButton
        />
      ) : (
        <strong>
          Delivery report has expired and is no longer available for download.\
        </strong>
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
          {type === ChannelType.Email && (
            <tr>
              <td className={cx(styles.status, 'md')}>
                <i
                  className={cx(styles.icon, styles.red, 'bx bx-error-circle')}
                ></i>
                Unsubscribers
              </td>
              {redacted ? (
                <td className={cx('md', styles.grayText)}>Report redacted</td>
              ) : (
                <td
                  className={'md'}
                  style={{ cursor: 'pointer' }}
                  onClick={exportUnsubscribers}
                >
                  <span className={cx(styles.linkLike, styles.textUnderline)}>
                    Unsubscribe list
                  </span>
                  <i
                    className={cx(styles.icon, styles.blue, 'bx bx-download')}
                    style={{ marginLeft: '5px' }}
                  ></i>
                </td>
              )}
              <td className={'sm'}>{unsubscribed}</td>
            </tr>
          )}
        </tbody>
      </table>
      <InfoBlock className={styles.notice}>
        We recommend that you remove unsubscribers from your campaign to avoid
        being marked as spam.{' '}
        <a
          href="https://go.gov.sg/postman-unsubscribe-guide"
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      </InfoBlock>
      {renderUpdateStats()}
    </div>
  )
}

export default ProgressDetails
