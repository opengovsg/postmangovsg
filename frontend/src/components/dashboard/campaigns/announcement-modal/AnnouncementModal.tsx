import React, { useContext, useState, useEffect } from 'react'
import { updateAnnouncementVersion } from 'services/settings.service'

import { ModalContext } from 'contexts/modal.context'

import { i18n } from 'locales'
import { ANNOUNCEMENT, getAnnouncementVersion } from 'config'
import { ErrorBlock } from 'components/common'
import GraphicAnnouncementModal from './GraphicAnnouncementModal'
import VideoAnnouncementModal from './VideoAnnouncementModal'
import styles from './AnnouncementModal.module.scss'

export type Translation = string | undefined

export type AnnouncementModalProps = {
  title: Translation
  mediaUrl: Translation
  subtext: Translation
  primaryButtonUrl: Translation
  primaryButtonText: Translation
  secondaryButtonUrl: Translation
  secondaryButtonText: Translation
  handleReadMoreClicked: () => Promise<void>
}

type Translations = Omit<AnnouncementModalProps, 'handleReadMoreClicked'>

function getTranslations(): Translations {
  // In lingui, we can't simply leave a translation empty as a default will be used during compilation.
  // Instead, mark it as "null" to indicate that it is empty.
  const EMPTY_TRANSLATION = 'null'
  const KEYS = [
    'title',
    'subtext',
    'mediaUrl',
    'primaryButtonUrl',
    'primaryButtonText',
    'secondaryButtonUrl',
    'secondaryButtonText',
  ]
  return KEYS.reduce((acc: Record<string, Translation>, cur) => {
    let translation: Translation = i18n._(ANNOUNCEMENT[cur])
    // Convert any "null" translations to undefined to make it simpler to parse
    if (translation === EMPTY_TRANSLATION) {
      translation = undefined
    }
    acc[cur] = translation
    return acc
  }, {}) as Translations
}

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
        await updateAnnouncementVersion(await getAnnouncementVersion())
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

  // Render the appropriate modal based on the type of content
  const translations = getTranslations()
  let specificAnnouncementModal = null
  if (isVideoUrl(translations.mediaUrl!)) {
    specificAnnouncementModal = (
      <VideoAnnouncementModal
        {...translations}
        handleReadMoreClicked={onReadMoreClicked}
      />
    )
  } else {
    specificAnnouncementModal = (
      <GraphicAnnouncementModal
        {...translations}
        handleReadMoreClicked={onReadMoreClicked}
      />
    )
  }

  return (
    <div className={styles.modal}>
      {specificAnnouncementModal}
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </div>
  )
}

export default AnnouncementModal
