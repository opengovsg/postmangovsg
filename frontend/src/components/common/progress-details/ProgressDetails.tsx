import React, { useState, useEffect } from 'react'
import Moment from 'react-moment'
import cx from 'classnames'

import { CampaignStats, Status } from 'classes/Campaign'
import { ProgressBar, PrimaryButton } from 'components/common'
import styles from './ProgressDetails.module.scss'
const ProgressDetails = ({ sentAt, numRecipients, stats, handlePause, handleRetry }:
  { sentAt: Date; numRecipients: number; stats: CampaignStats; handlePause: Function; handleRetry: Function }) => {
  const { status, error, unsent, sent } = stats
  const [isSent, setIsSent] = useState(status === Status.Sent)
  const [isComplete, setIsComplete] = useState(!error && !unsent)
  useEffect(() => {
    setIsComplete(!error && !unsent)
    setIsSent(status === Status.Sent)
  }, [status, error, unsent])

  function renderButton() {
    if (!isSent) {
      return (
        <PrimaryButton className={styles.pause} onClick={handlePause} >
          Pause sending
          <i className={cx(styles.icon, 'bx bx-error-circle')}></i>
        </PrimaryButton>
      )
    }
    if (!isComplete) {
      return (
        <PrimaryButton className={styles.retry} onClick={handleRetry} >
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
              <th className={styles.md}>Sent date</th>
              <th className={styles.md}>Messages sent</th>
              <th className={styles.sm}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.md}>
                <Moment format='LLL'>{sentAt}</Moment>
              </td>

              <td className={styles.md}>
                {numRecipients}
              </td>
              <td className={cx(styles.campaignStatus, styles.sm)}>
                {status}
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.progressTitle}>
          <h2>{isComplete ? 'Sending completed': 'Progress' }</h2>
          {renderButton()}
        </div>
        <ProgressBar progress={numRecipients - unsent} total={numRecipients} isComplete={isComplete}/>

        <table className={styles.stats}>
          <thead>
            <tr>
              <th className={styles.md}>Status</th>
              <th className={styles.md}>Description</th>
              <th className={styles.sm}>Message count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cx(styles.status, styles.md)}>
                <i className={cx(styles.icon, styles.red, 'bx bx-error-circle')}></i>
                Error
              </td>
              <td className={styles.md}>Could not be sent</td>
              <td className={styles.sm}>{error}</td>
            </tr>
            <tr>
              <td className={cx(styles.status, styles.md)}>
                <i className={cx(styles.icon, styles.blue, 'bx bx-time-five')}></i>
                Unsent
              </td>
              <td className={styles.md}>In the queue</td>
              <td className={styles.sm}>{unsent}</td>
            </tr>
            <tr>
              <td className={cx(styles.status, styles.md)}>
                <i className={cx(styles.icon, styles.green, 'bx bx-check-circle')}></i>
                Sent
              </td>
              <td className={styles.md}>Sent to recipient</td>
              <td className={styles.sm}>{sent}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ProgressDetails
