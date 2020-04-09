import React, { useContext } from 'react'
import cx from 'classnames'

import { ModalContext } from 'contexts/modal.context'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
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
            <FontAwesomeIcon
              onClick={handleCloseModal}
              className={cx(styles.icon, styles.close)}
              icon={faTimes}
            />
            {modalContext.modalContent}
          </div>
        </div>
      }
    </>
  )
}

export default Modal