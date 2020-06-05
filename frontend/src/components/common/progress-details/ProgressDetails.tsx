import React, { useState, useEffect } from 'react'
import Moment from 'react-moment'
import cx from 'classnames'

import { CampaignStats, Status } from 'classes/Campaign'
import {
  ProgressBar,
  PrimaryButton,
  InvalidRecipientsCsv,
} from 'components/common'
import styles from './ProgressDetails.module.scss'
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
  const { status, error, unsent, sent, invalid, updatedAt } = stats
  const [isSent, setIsSent] = useState(status === Status.Sent)
  const [isComplete, setIsComplete] = useState(!error && !unsent)

  useEffect(() => {
    setIsComplete(!error && !unsent)
    setIsSent(status === Status.Sent)
  }, [status, error, unsent])

  function renderButton() {
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

  return (
    <>
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
              <td className={cx(styles.campaignStatus, 'sm')}>{status}</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.progressTitle}>
          <h2>{isComplete ? 'Sending completed' : 'Progress'}</h2>
          {renderButton()}
        </div>
        <ProgressBar
          progress={numRecipients - unsent}
          total={numRecipients}
          isComplete={isComplete}
        />

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
              <td className={cx('sm', styles.error)}>
                {error}
                <InvalidRecipientsCsv
                  campaignId={campaignId}
                  campaignName={campaignName}
                  status={status}
                  error={error}
                  sentAt={sentAt}
                  updatedAt={updatedAt}
                />
              </td>
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
                  className={cx(
                    styles.icon,
                    styles.green,
                    'bx bx-check-circle'
                  )}
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
    </>
  )
}

export default ProgressDetails
