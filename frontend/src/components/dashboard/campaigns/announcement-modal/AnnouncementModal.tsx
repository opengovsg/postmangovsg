import React, { useContext, useState } from 'react'
import cx from 'classnames'

import { PrimaryButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import styles from './AnnouncementModal.module.scss'

const AnnouncementModal = ({
  title,
  subtitle,
  subtext,
  imageUrl,
  buttonText,
  buttonIcon,
  destructive,
  onReadMore,
  onClose,
}: {
  title: string
  subtitle: string
  subtext: string
  imageUrl: string
  buttonText: string
  buttonIcon?: string
  destructive?: boolean
  onReadMore: () => void
  onClose: () => void
}) => {
  const modalContext = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')
  const modalBackgroundId = 'modal-background'

  async function handleClickBackground(event: any) {
    if (event.target.id === modalBackgroundId) {
      onClose()
    }
  }

  async function onReadMoreClicked(): Promise<void> {
    try {
      await onReadMore()
      // Closes the modal
      modalContext.close()
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  return (
    <div
      id={modalBackgroundId}
      className={styles.modalBg}
      onClick={handleClickBackground}
    >
      <div className={styles.modal}>
        <div className={styles.modalImg}>
          <img src={imageUrl} alt="Modal graphic"></img>
        </div>
        <h2 className={styles.title}>{title}</h2>
        <h4 className={styles.subtitle}>{subtitle}</h4>
        <div className={styles.content}>{subtext}</div>
        <div className={styles.options}>
          <PrimaryButton
            className={destructive ? styles.redButton : styles.greenButton}
            onClick={onReadMoreClicked}
          >
            {buttonText}
            {buttonIcon && (
              <i className={cx('bx', styles.icon, buttonIcon)}></i>
            )}
          </PrimaryButton>
        </div>
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </div>
    </div>
  )
}

export default AnnouncementModal
