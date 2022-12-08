import { useContext } from 'react'

import styles from './CancelSchedulingModal.module.scss'

import EmptyDashboardImg from 'assets/img/empty-dashboard.png'
import { Campaign } from 'classes'
import { ActionButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'
import { cancelScheduledCampaign } from 'services/campaign.service'

const CancelSchedulingModal = ({ campaign }: { campaign: Campaign }) => {
  const { id } = campaign
  const { close } = useContext(ModalContext)

  async function handleCancelSchedule() {
    await cancelScheduledCampaign(id)
    await window.location.reload()
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
