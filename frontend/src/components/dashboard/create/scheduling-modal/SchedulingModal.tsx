import cx from 'classnames'
import moment from 'moment'
import React, { useCallback, useContext, useState } from 'react'

import styles from './SchedulingModal.module.scss'

import { Campaign } from 'classes'
import { ActionButton } from 'components/common'
import { confirmSendCampaign } from 'components/dashboard/create/util'
import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'

const SchedulingModal = ({ campaign }: { campaign: Campaign }) => {
  const modalContext = useContext(ModalContext)
  const { updateCampaign } = useContext(CampaignContext)
  // initial visibleAt
  const scheduledAt = campaign.scheduledAt
  const [scheduledDate, setScheduledDate] = useState<string>(
    scheduledAt ? moment(scheduledAt).format('yyyy-M-DD') : ''
  )
  const [scheduledTime, setScheduledTime] = useState<string>(
    scheduledAt ? scheduledAt.toLocaleTimeString() : ''
  )

  const scheduleTheSend = useCallback(() => {
    // combine date and time
    const scheduledDatetime = moment(scheduledDate + 'T' + scheduledTime)
    void confirmSendCampaign({
      campaignId: +campaign.id,
      sendRate: 0,
      channelType: campaign.type,
      updateCampaign,
      scheduledTiming: scheduledDatetime.toDate(),
    })
    modalContext.close()
    return
  }, [
    scheduledDate,
    scheduledTime,
    campaign.id,
    campaign.type,
    updateCampaign,
    modalContext,
  ])

  async function handleScheduleCampaign(_: React.MouseEvent<HTMLDivElement>) {
    // form the payload from the date and time.
    scheduleTheSend()
    return
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScheduledDate(e.target.value)
    return
  }

  async function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScheduledTime(e.target.value)
    return
  }

  return (
    <>
      <div className={styles.title}>
        Schedule your campaign "{campaign.name}"
      </div>
      <div className={styles.subtitle}>
        Select a date and time to send out your campaign.
      </div>
      <div className={styles.datetimeWrapper}>
        <div className={styles.dateWrapper}>
          <div>Date</div>
          <input
            type={'date'}
            className={styles.dateInput}
            value={scheduledDate}
            min={moment().format('yyyy-M-D')}
            onChange={handleDateChange}
            name={'Date'}
          />
        </div>
        <div className={styles.timeWrapper}>
          <div>Time</div>
          <input
            type="time"
            className={styles.timeInput}
            onChange={handleTimeChange}
            value={scheduledTime}
          />
        </div>
      </div>
      <div className="separator"></div>
      <div className={styles.actionButton}>
        <ActionButton disabled={!scheduledDate || !scheduledTime}>
          <div onClick={handleScheduleCampaign}>
            Schedule campaign
            <div>
              <i className={cx(styles.icon, 'bx bx-calendar-event')}></i>
            </div>
          </div>
        </ActionButton>
      </div>
    </>
  )
}

export default SchedulingModal
