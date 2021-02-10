import React, { useContext, useState, useEffect } from 'react'
import cx from 'classnames'
import { updateAnnouncementVersion } from 'services/settings.service'

import { PrimaryButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import styles from './AnnouncementModal.module.scss'
import { i18n } from 'locales'
import { ANNOUNCEMENT } from 'config'
import { OutboundLink } from 'react-ga'

const AnnouncementModal = () => {
  const { close, setBeforeClose } = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setBeforeClose(() => async () => {
      try {
        await updateAnnouncementVersion(await ANNOUNCEMENT.version)
      } catch (err) {
        setErrorMessage(err.message)
      }
    })
  }, [setBeforeClose])

  async function onReadMoreClicked(): Promise<void> {
    try {
      // Closes the modal
      await close()
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  return (
    <div className={styles.modal}>
      <img
        className={styles.modalImg}
        src={i18n._(ANNOUNCEMENT.imageUrl)}
        alt="Modal graphic"
      ></img>
      <h4 className={styles.title}>{i18n._(ANNOUNCEMENT.title)}</h4>
      <div className={styles.content}>{i18n._(ANNOUNCEMENT.subtext)}</div>
      <div className={styles.options}>
        <OutboundLink
          eventLabel={i18n._(ANNOUNCEMENT.buttonUrl)}
          to={i18n._(ANNOUNCEMENT.buttonUrl)}
          target="_blank"
        >
          <PrimaryButton onClick={onReadMoreClicked}>
            <span>{i18n._(ANNOUNCEMENT.buttonText)}</span>
            <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
          </PrimaryButton>
        </OutboundLink>{' '}
      </div>
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </div>
  )
}

export default AnnouncementModal
