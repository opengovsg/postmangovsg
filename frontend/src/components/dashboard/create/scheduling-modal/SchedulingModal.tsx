import { DatePicker } from '@opengovsg/design-system-react'
import cx from 'classnames'
import moment from 'moment'
import React, { useCallback, useContext, useState } from 'react'

import styles from './SchedulingModal.module.scss'

import { Campaign } from 'classes'
import { ActionButton } from 'components/common'
import { confirmSendCampaign } from 'components/dashboard/create/util'
import { CampaignContext } from 'contexts/campaign.context'
// import { ModalContext } from 'contexts/modal.context'

const SchedulingModal = ({ campaign }: { campaign: Campaign }) => {
  // const modalContext = useContext(ModalContext)
  const { updateCampaign } = useContext(CampaignContext)

  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState<string>()

  const scheduleTheSend = useCallback(() => {
    // combine date and time
    const scheduledDatetime = moment(
      moment(scheduledDate).format('YYYY-MM-DD') + 'T' + scheduledTime
    )
    void confirmSendCampaign({
      campaignId: +campaign.id,
      sendRate: 0,
      channelType: campaign.type,
      updateCampaign,
      scheduledTiming: scheduledDatetime.toDate(),
    })
    return
  }, [scheduledDate, scheduledTime, campaign.id, campaign.type, updateCampaign])

  async function handleScheduleCampaign(_: React.MouseEvent<HTMLDivElement>) {
    // form the payload from the date and time.
    // modalContext.close()
    scheduleTheSend()

    return
  }

  async function handleDateChange(d: Date) {
    setScheduledDate(d)
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
          <DatePicker
            className={styles.dateInput}
            defaultValue={scheduledDate?.toDateString()}
            isDateUnavailable={(d) => d < new Date(Date.now() - 86400000)}
            onSelectDate={handleDateChange}
          />
          {/*<DateInput*/}
          {/*  className={styles.dateInput}*/}
          {/*  value={scheduledDate?.toDateString()}*/}
          {/*  isDateUnavailable={(d) => d < new Date(Date.now() - 86400000)}*/}
          {/*  onChange={function Ol() {*/}
          {/*    return*/}
          {/*  }}*/}
          {/*  name={'Date'}*/}
          {/*/>*/}
        </div>
        <div className={styles.timeWrapper}>
          <input
            type="time"
            className={styles.timeInput}
            placeholder="Time"
            onChange={handleTimeChange}
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
