import cx from 'classnames'
import React, { useContext } from 'react'

import Moment from 'react-moment'

import styles from './CampaignScheduledInfo.module.scss'

import { ActionButton, StepHeader, TextButton } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'

const CampaignScheduledInfo = () => {
  const { campaign } = useContext(CampaignContext)

  async function handleEditCampaign() {
    // break down scheduled at and split it up
    console.log('edit clicked')
    return
  }

  return (
    <>
      <StepHeader title="Your campaign has been scheduled!">
        <p>
          Your campaign has been scheduled to be sent on{' '}
          <Moment format="LLL" interval={0}>
            {campaign.scheduledAt}
          </Moment>
          .
        </p>
        <p>
          Please note that for larger campaigns with many recipients, it may
          take a while for your campaign to fully complete sending to all
          recipients.
        </p>
      </StepHeader>
      <div className={styles.buttonWrapper}>
        <TextButton onClick={() => console.log('Cancel clicked')}>
          Cancel scheduling
        </TextButton>
        <ActionButton>
          <div onClick={handleEditCampaign}>
            Reschedule campaign
            <div>
              <i className={cx(styles.icon, 'bx bx-calendar-event')}></i>
            </div>
          </div>
        </ActionButton>
      </div>
    </>
  )
}

export default CampaignScheduledInfo
