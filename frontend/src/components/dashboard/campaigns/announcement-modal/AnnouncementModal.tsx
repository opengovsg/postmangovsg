import React, { useContext, useState } from 'react'
import cx from 'classnames'

import { PrimaryButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import styles from './AnnouncementModal.module.scss'
import { i18n } from '@lingui/core'
import { ANNOUNCEMENT } from 'config'

const AnnouncementModal = ({
  onReadMore,
  onClose,
}: {
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
          <img src={i18n._(ANNOUNCEMENT.imageUrl)} alt="Modal graphic"></img>
        </div>
        <h2 className={styles.title}>{i18n._(ANNOUNCEMENT.title)}</h2>
        <h4 className={styles.subtitle}>{i18n._(ANNOUNCEMENT.subtitle)}</h4>
        <div className={styles.content}>{i18n._(ANNOUNCEMENT.subtext)}</div>
        <div className={styles.options}>
          <PrimaryButton onClick={onReadMoreClicked}>
            <span>Read guide</span>
            <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
          </PrimaryButton>
        </div>
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </div>
    </div>
  )
}

export default AnnouncementModal
