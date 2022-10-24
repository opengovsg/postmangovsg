import type { ReactNode } from 'react'
import cx from 'classnames'
import { CloseButton } from 'components/common'

import styles from './Modal.module.scss'

const Modal = ({
  onClose,
  children,
  modalTitle,
}: {
  onClose: any
  children: ReactNode
  modalTitle?: string
}) => {
  const modalBackgroundId = 'modal-background'

  function handleClickBackground(event: any) {
    if (event.target.id === modalBackgroundId) {
      onClose()
    }
  }
  if (children) {
    return (
      <div
        id={modalBackgroundId}
        className={styles.modalBg}
        onClick={handleClickBackground}
      >
        <div className={styles.modal}>
          {modalTitle ? (
            <div className={styles.modalTitle}>{modalTitle}</div>
          ) : (
            <></>
          )}
          <CloseButton
            onClick={onClose}
            className={cx(styles.close, {
              [styles.modalTitleClose]: !!modalTitle,
            })}
            title="Close modal"
          />
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    )
  }

  return null
}

export default Modal
