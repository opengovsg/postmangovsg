import React from 'react'
import { TextButton, PrimaryButton } from 'components/common'
import { OutboundLink } from 'react-ga'
import cx from 'classnames'

import { Translation } from './AnnouncementModal'
import styles from './AnnouncementModalOptions.module.scss'

interface AnnouncementModalOptionsProps {
  primaryButtonUrl: Translation
  primaryButtonText: Translation
  secondaryButtonUrl: Translation
  secondaryButtonText: Translation
  handleReadMoreClicked: () => Promise<void>
}

const AnnouncementModalOptions = ({
  primaryButtonUrl,
  primaryButtonText,
  secondaryButtonUrl,
  secondaryButtonText,
  handleReadMoreClicked,
}: AnnouncementModalOptionsProps) => {
  let secondaryLink = null
  if (secondaryButtonText !== undefined) {
    // If the URL is non-empty, the secondary button is an external link.
    // Otherwise, it is just a button to close the modal.
    secondaryLink = (
      <TextButton className={styles.option} onClick={handleReadMoreClicked}>
        {secondaryButtonText}
      </TextButton>
    )

    if (secondaryButtonUrl !== undefined) {
      secondaryLink = (
        <OutboundLink
          className={styles.option}
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
    <div className={styles.container}>
      {secondaryLink}
      <OutboundLink
        className={styles.option}
        eventLabel={primaryButtonUrl!}
        to={primaryButtonUrl!}
        target="_blank"
      >
        <PrimaryButton onClick={handleReadMoreClicked}>
          <span>{primaryButtonText!}</span>
          <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
        </PrimaryButton>
      </OutboundLink>{' '}
    </div>
  )
}

export default AnnouncementModalOptions
