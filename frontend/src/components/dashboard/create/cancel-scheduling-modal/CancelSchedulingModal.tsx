import styles from './CancelSchedulingModal.module.scss'

import EmptyDashboardImg from 'assets/img/empty-dashboard.png'
import { Campaign } from 'classes'
import { ActionButton } from 'components/common'

const CancelSchedulingModal = ({ campaign }: { campaign: Campaign }) => {
  console.log('campaign:', campaign)

  async function handleCancelSchedule() {
    console.log('handle this bro')
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
