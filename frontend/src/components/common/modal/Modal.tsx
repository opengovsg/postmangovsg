import React, { useContext } from 'react'
import cx from 'classnames'

import { ModalContext } from 'contexts/modal.context'
import styles from './Modal.module.scss'

const Modal = () => {
  const modalContext = useContext(ModalContext)

  const handleCloseModal = () => {
    modalContext.setModalOpen(false)
  }

  return (
    <>
      {
        modalContext.modalOpen &&
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <p
              onClick={handleCloseModal}
              className={cx(styles.icon, styles.close)}
            >
              x
            </p>
            {modalContext.modalContent}
          </div>
        </div>
      }
    </>
  )
}

export default Modal