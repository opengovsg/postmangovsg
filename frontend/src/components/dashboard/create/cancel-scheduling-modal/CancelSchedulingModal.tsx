import { useContext } from 'react'

import styles from './CancelSchedulingModal.module.scss'

import EmptyDashboardImg from 'assets/img/empty-dashboard.png'
import { Campaign } from 'classes'
import { ActionButton } from 'components/common'
import { confirmCancelScheduledCampaign } from 'components/dashboard/create/util'
import { ModalContext } from 'contexts/modal.context'

const CancelSchedulingModal = ({
  campaign,
  updateCampaign,
}: {
  campaign: Campaign
  updateCampaign: (changes: Partial<Campaign>) => void
}) => {
  const { id } = campaign
  const { close } = useContext(ModalContext)

  async function handleCancelSchedule() {
    await confirmCancelScheduledCampaign({ campaignId: id, updateCampaign })
    close()
  }

  return (
    <>
      <div className={styles.modalWrapper}>
        <img
          className={styles.image}
          src={EmptyDashboardImg}
          alt="Empty dashboard graphic"
        />
        <h2>Cancel Scheduling?</h2>
        <p>Your campaign will be saved as a draft</p>
        <ActionButton>
          <div onClick={handleCancelSchedule}>Cancel scheduling</div>
        </ActionButton>
      </div>
    </>
  )
}

export default CancelSchedulingModal
