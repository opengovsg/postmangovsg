import React, { useContext, useState, useEffect } from 'react'
import cx from 'classnames'
import { updateAnnouncementVersion } from 'services/settings.service'

import { PrimaryButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import styles from './AnnouncementModal.module.scss'
import { i18n } from 'locales'
import { ANNOUNCEMENT } from 'config'

const AnnouncementModal = () => {
  const { close, setCustomClose } = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')
  const modalBackgroundId = 'modal-background'

  useEffect(() => {
    console.log('setting custom close')
    setCustomClose(() => {
      updateAnnouncementVersion(i18n._(ANNOUNCEMENT.version))
    })
  }, [setCustomClose])

  async function onReadMoreClicked(): Promise<void> {
    try {
      // await onReadMore()
      // Closes the modal
      close()
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  return (
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
  )
}

export default AnnouncementModal
