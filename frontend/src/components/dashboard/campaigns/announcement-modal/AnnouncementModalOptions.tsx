import { OutboundLink } from 'react-ga'
import cx from 'classnames'
import { PrimaryButton, TextButton } from 'components/common'

import styles from './AnnouncementModalOptions.module.scss'

interface AnnouncementModalOptionsProps {
  primaryButtonUrl: string
  primaryButtonText: string
  handleReadMoreClicked: () => Promise<void>

  // Optional parameters
  secondaryButtonUrl?: string
  secondaryButtonText?: string
}

const AnnouncementModalOptions = ({
  primaryButtonUrl,
  primaryButtonText,
  secondaryButtonUrl,
  secondaryButtonText,
  handleReadMoreClicked,
}: AnnouncementModalOptionsProps) => {
  // The secondary button closes the modal.
  // If the secondary URL is defined, the button also navigates to the specified URL.
  let secondaryLink = null
  if (secondaryButtonText) {
    secondaryLink = (
      <TextButton className={styles.option} onClick={handleReadMoreClicked}>
        {secondaryButtonText}
      </TextButton>
    )

    if (secondaryButtonUrl) {
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
        eventLabel={primaryButtonUrl}
        to={primaryButtonUrl}
        target="_blank"
      >
        <PrimaryButton onClick={handleReadMoreClicked}>
          <span>{primaryButtonText}</span>
          <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
        </PrimaryButton>
      </OutboundLink>{' '}
    </div>
  )
}

export default AnnouncementModalOptions
