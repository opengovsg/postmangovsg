import React from 'react'

import { CloseButton } from 'components/common'
import styles from './Modal.module.scss'

const Modal = ({ onClose, children }: { onClose: any; children: React.ReactNode }) => {

  const modalBackgroundId = 'modal-background'

  function handleClickBackground(event: any) {
    if (event.target.id === modalBackgroundId) {
      onClose()
    }
  }
  if (children) {
    return (
      <div id={modalBackgroundId} className={styles.modalBg} onClick={handleClickBackground}>
        <div className={styles.modal}>
          <CloseButton
            onClick={onClose}
            className={styles.close}
          />
          <div className={styles.content}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Modal