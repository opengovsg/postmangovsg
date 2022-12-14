import React, { useContext } from 'react'

import Moment from 'react-moment'

import styles from './CampaignScheduledInfo.module.scss'

import { Campaign } from 'classes'
import { StepHeader, TextButton } from 'components/common'
import CancelSchedulingModal from 'components/dashboard/create/cancel-scheduling-modal'
import SchedulingButton from 'components/dashboard/create/common/SchedulingButton'
import { ModalContext } from 'contexts/modal.context'

const CampaignScheduledInfo = ({
  campaign,
  updateCampaign,
}: {
  campaign: Campaign
  updateCampaign: (changes: Partial<Campaign>) => void
}) => {
  const modalContext = useContext(ModalContext)

  // open cancel confirm modal
  async function handleCancelSchedule() {
    modalContext.setModalContent(
      <CancelSchedulingModal
        campaign={campaign}
        updateCampaign={updateCampaign}
      />
    )
    return
  }

  return (
    <>
      <StepHeader title="Your campaign has been scheduled!">
        <p>
          Your campaign has been scheduled to be sent on{' '}
          <b>
            <Moment format="LLL" interval={0}>
              {campaign.scheduledAt}
            </Moment>
          </b>
          .
        </p>
        <p>
          Please note that for larger campaigns with many recipients, it may
          take a while for your campaign to fully complete sending to all
          recipients.
        </p>
      </StepHeader>
      <div className={styles.buttonWrapper}>
        <TextButton onClick={handleCancelSchedule}>
          Cancel scheduling
        </TextButton>
        <SchedulingButton
          campaign={campaign}
          updateCampaign={updateCampaign}
          buttonText={'Reschedule Campaign'}
        />
      </div>
    </>
  )
}

export default CampaignScheduledInfo
