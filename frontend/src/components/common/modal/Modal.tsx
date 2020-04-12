import React from 'react'
import cx from 'classnames'

import styles from './Modal.module.scss'

const Modal = ({ onClose, children }: { onClose: any; children: React.ReactNode }) => {

  function handleClickBackground(event: any) {
    if (event.target.className === styles.modalBg) {
      onClose()
    }
  }
  if (children) {
    return (
      <>
        <div className={styles.modalBg} onClick={handleClickBackground}>
          <div className={styles.modal}>
            <p
              onClick={onClose}
              className={cx(styles.icon, styles.close)}
            >
              x
            </p>
            {children}
          </div>
        </div>
      </>
    )
  }

  return null
}

export default Modal