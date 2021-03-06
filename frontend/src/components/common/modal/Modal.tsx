import cx from 'classnames'

import type { ReactNode } from 'react'

import styles from './Modal.module.scss'

import { CloseButton } from 'components/common'

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
