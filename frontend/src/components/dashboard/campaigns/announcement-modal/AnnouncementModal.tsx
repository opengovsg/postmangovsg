import React, { useContext, useState, useEffect } from 'react'
import cx from 'classnames'
import { updateAnnouncementVersion } from 'services/settings.service'

import { PrimaryButton, ErrorBlock, TextButton } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import styles from './AnnouncementModal.module.scss'
import { i18n } from 'locales'
import { ANNOUNCEMENT } from 'config'
import { OutboundLink } from 'react-ga'
import ReactPlayer from 'react-player/lazy'

function isVideoUrl(url: string) {
  url = url.toLowerCase()
  const VIDEO_EXTENSIONS = ['mp4']
  return VIDEO_EXTENSIONS.some((extension) => url.endsWith(`.${extension}`))
}

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

  const mediaUrl = i18n._(ANNOUNCEMENT.mediaUrl)
  let mediaAndTitle = null
  if (isVideoUrl(mediaUrl)) {
    mediaAndTitle = (
      <>
        <h4 className={`${styles.title} ${styles.titleTop}`}>
          {i18n._(ANNOUNCEMENT.title)}
        </h4>
        <ReactPlayer
          url={mediaUrl}
          className={styles.modalMedia}
          controls
          playing
          width="100%"
          height="100%"
        />
      </>
    )
  } else {
    mediaAndTitle = (
      <>
        <img
          className={`${styles.modalMedia} ${styles.modalImg}`}
          src={mediaUrl}
          alt="Modal graphic"
        ></img>
        <h4 className={`${styles.title} ${styles.titleCentered}`}>
          {i18n._(ANNOUNCEMENT.title)}
        </h4>
      </>
    )
  }

  // In lingui, we can't simply leave a translation empty as a default will be used during compilation.
  // Instead, mark it as "null" to indicate that it is empty.
  const EMPTY_TRANSLATION = 'null'
  const subtextText = i18n._(ANNOUNCEMENT.subtext)
  let subtext = null
  if (subtextText !== EMPTY_TRANSLATION) {
    subtext = <div className={styles.content}>{subtextText}</div>
  }

  const secondaryButtonText = i18n._(ANNOUNCEMENT.secondaryButtonText)
  let secondaryLink = null
  if (secondaryButtonText !== EMPTY_TRANSLATION) {
    // If the URL is non-empty, the secondary button is an external link.
    // Otherwise, it is just a button to close the modal.
    secondaryLink = (
      <TextButton onClick={onReadMoreClicked}>{secondaryButtonText}</TextButton>
    )

    const secondaryButtonUrl = i18n._(ANNOUNCEMENT.secondaryButtonUrl)
    if (secondaryButtonUrl !== EMPTY_TRANSLATION) {
      secondaryLink = (
        <OutboundLink
          eventLabel={secondaryButtonUrl}
          to={secondaryButtonUrl}
          target="_blank"
        >
          {secondaryLink}
        </OutboundLink>
      )
    }
  }

  return (
    <div className={styles.modal}>
      {mediaAndTitle}
      {subtext}
      <div className={styles.options}>
        {secondaryLink}
        <OutboundLink
          eventLabel={i18n._(ANNOUNCEMENT.primaryButtonUrl)}
          to={i18n._(ANNOUNCEMENT.primaryButtonUrl)}
          target="_blank"
        >
          <PrimaryButton onClick={onReadMoreClicked}>
            <span>{i18n._(ANNOUNCEMENT.primaryButtonText)}</span>
            <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
          </PrimaryButton>
        </OutboundLink>{' '}
      </div>
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </div>
  )
}

export default AnnouncementModal
