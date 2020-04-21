import React, { useContext, useState } from 'react'
import cx from 'classnames'

import { PrimaryButton } from 'components/common'
import ModalImage from 'assets/img/confirm-modal.svg'
import styles from './ConfirmModal.module.scss'
import { sendCampaign } from 'services/campaign.service'
import { ModalContext } from 'contexts/modal.context'

const ConfirmModal = ({ campaignId }: {campaignId: number}) => {
  const modalContext = useContext(ModalContext)
  const [disabled, setDisabled] = useState(false)
  async function handleSend(): Promise<void>{
    try {
      setDisabled(true)
      await sendCampaign(campaignId)
      // Close the modal
      modalContext.setModalContent(null)
      // Reloads the page
      window.location.href = `/campaigns/${campaignId}`

    }catch(err){
      console.error(err)
      setDisabled(false)
    }
  }
  return (
    <div className={styles.confirm}>
      <div className={styles.modalImg}>
        <img src={ModalImage} alt="Modal graphic"></img>
      </div>
      <h2 className={styles.title}>Are you absolutely sure?</h2>
      <h4 className={styles.subtitle}>Sending out a campaign is irreversible.</h4>
      <PrimaryButton className={styles.button} onClick={handleSend} disabled={disabled}>
        Confirm send now
        <i className={cx('bx', styles.icon, 'bx-send')}></i>
      </PrimaryButton>
    </div>
  )
}

export default ConfirmModal