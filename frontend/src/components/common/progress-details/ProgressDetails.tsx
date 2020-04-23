import React, { useState } from 'react'
import Moment from 'react-moment'
import cx from 'classnames'

import { CampaignStats, Status } from 'classes/Campaign'
import { ProgressBar, PrimaryButton } from 'components/common'
import styles from './ProgressDetails.module.scss'
import { useParams } from 'react-router-dom'
import { stopCampaign, retryCampaign } from 'services/campaign.service'

const ProgressDetails = ({ sentAt, numRecipients, stats }: { sentAt: Date; numRecipients: number; stats: CampaignStats }) => {
  const params: {id?: string} = useParams()
  const [retryDisabled, setRetryDisabled] = useState(stats.status === Status.Sending)
  const [pauseDisabled, setPauseDisabled] = useState(stats.status === Status.Sent)

  async function handleStop(): Promise<void>{
    try {
      setPauseDisabled(true)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await stopCampaign(+params.id!)
    }catch(err){
      console.error(err)
      setPauseDisabled(false)
    }
  }
  async function handleRetry(): Promise<void>{
    try {
      setRetryDisabled(true)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await retryCampaign(+params.id!)
    }catch(err){
      console.error(err)
      setRetryDisabled(false)
    }
  }
  const { status, error, unsent, sent} = stats
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
          <h2>Progress</h2>
          {
            status === Status.Sent
              ? (
                <PrimaryButton className={styles.retry} onClick={handleRetry} disabled={retryDisabled}>
                  Retry sending errored messages
                  <i className={cx(styles.icon, 'bx bx-revision')}></i>
                </PrimaryButton>
              )
              : (
                <PrimaryButton className={styles.pause} onClick={handleStop} disabled={pauseDisabled}>
                  Pause sending
                  <i className={cx(styles.icon, 'bx bx-error-circle')}></i>
                </PrimaryButton>
              )
          }
        </div>
        <ProgressBar progress={numRecipients - unsent} total={numRecipients} />

        <table className={styles.stats}>
          <thead>
            <tr>
              <th className={styles.md}>Status</th>
              <th className={styles.md}>Description</th>
              <th className={styles.sm}>SMS count</th>
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
                <i className={cx(styles.icon, styles.blue, 'bx bx-check-circle')}></i>
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
