import cx from 'classnames'
import moment from 'moment'
import React, { useCallback, useContext, useMemo, useState } from 'react'

import styles from './SchedulingModal.module.scss'

import { Campaign } from 'classes'
import { ActionButton, ErrorBlock } from 'components/common'
import { confirmSendCampaign } from 'components/dashboard/create/util'
import { ModalContext } from 'contexts/modal.context'

const SchedulingModal = ({
  campaign,
  updateCampaign,
}: {
  campaign: Campaign
  updateCampaign: (campaign: Partial<Campaign>) => void
}) => {
  const modalContext = useContext(ModalContext)
  const scheduledAt = campaign.scheduledAt
  const [scheduledDate, setScheduledDate] = useState<string>(
    scheduledAt ? moment(scheduledAt).format('yyyy-M-DD') : ''
  )
  const [scheduledTime, setScheduledTime] = useState<string>(
    scheduledAt ? scheduledAt.toLocaleTimeString() : ''
  )

  const scheduledDatetime = useMemo(() => {
    if (scheduledDate && scheduledTime) {
      return moment(scheduledDate + 'T' + scheduledTime)
    }
    return moment()
  }, [scheduledDate, scheduledTime])

  console.log('scheduled datetime: ', scheduledDatetime)

  const scheduleTheSend = useCallback(async () => {
    // combine date and time
    void (await confirmSendCampaign({
      campaignId: +campaign.id,
      sendRate: 0,
      channelType: campaign.type,
      updateCampaign,
      scheduledTiming: scheduledDatetime.toDate(),
    }))
    modalContext.close()
    return
  }, [
    scheduledDatetime,
    campaign.id,
    campaign.type,
    updateCampaign,
    modalContext,
  ])

  async function handleScheduleCampaign(_: React.MouseEvent<HTMLDivElement>) {
    // form the payload from the date and time.
    if (
      !scheduledDate ||
      !scheduledTime ||
      scheduledDatetime.isBefore(moment())
    ) {
      return
    }
    await scheduleTheSend()
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value
    setScheduledDate(newDate)
  }

  async function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = e.target.value
    setScheduledTime(newTime)
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
          <div className={styles.dateText}>Date</div>
          <input
            type={'date'}
            className={styles.dateInput}
            value={scheduledDate}
            min={moment().format('yyyy-M-DD')}
            onChange={handleDateChange}
            name={'Date'}
          />
        </div>
        <div className={styles.timeWrapper}>
          <div className={styles.timeText}>Time</div>
          <input
            type="time"
            className={styles.timeInput}
            onChange={handleTimeChange}
            value={scheduledTime}
          />
        </div>
      </div>
      {scheduledDate && scheduledTime && scheduledDatetime.isBefore(moment()) && (
        <ErrorBlock>
          <div>
            Select a <b>future time</b> to schedule your campaign.
          </div>
        </ErrorBlock>
      )}

      <div className="separator"></div>
      <div className={styles.actionButton}>
        <ActionButton
          disabled={
            !scheduledDate ||
            !scheduledTime ||
            scheduledDatetime.isBefore(moment())
          }
        >
          <div
            onClick={handleScheduleCampaign}
            className={cx({
              [styles.disabledContent]:
                !scheduledDate ||
                !scheduledTime ||
                scheduledDatetime.isBefore(moment()),
            })}
          >
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
