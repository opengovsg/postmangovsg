import { DateInput, DatePicker } from '@opengovsg/design-system-react'
import cx from 'classnames'
import React, { useContext, useState } from 'react'

import styles from './SchedulingModal.module.scss'

import { Campaign } from 'classes'
import { ActionButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

const SchedulingModal = ({ campaign }: { campaign: Campaign }) => {
  const modalContext = useContext(ModalContext)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState<string>()

  async function handleScheduleCampaign(e: React.MouseEvent<HTMLDivElement>) {
    console.log(e)
    modalContext.close()
    return
  }

  async function handleDateChange(d: Date) {
    setScheduledDate(d)
    console.log('scheduledDate:', scheduledDate)
    return
  }

  async function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log(e)
    setScheduledTime(e.target.value)
    console.log('scheduled time: ', scheduledTime)
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
            onChange={function Ol() {
              return
            }}
          />
          <DateInput
            className={styles.dateInput}
            value={scheduledDate?.toDateString()}
            isDateUnavailable={(d) => d < new Date(Date.now() - 86400000)}
            onChange={function Ol() {
              return
            }}
            name={'Date'}
          />
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
