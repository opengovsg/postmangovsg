import cx from 'classnames'

import styles from './AnnouncementModalOptions.module.scss'

import { TextButton, PrimaryButton } from 'components/common'

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
        <a
          className={styles.option}
          href={secondaryButtonUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {secondaryLink}
        </a>
      )
    }
  }

  return (
    <div className={styles.container}>
      {secondaryLink}
      <a
        className={styles.option}
        href={primaryButtonUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <PrimaryButton onClick={handleReadMoreClicked}>
          <span>{primaryButtonText}</span>
          <i className={cx('bx', styles.icon, 'bx-right-arrow-alt')}></i>
        </PrimaryButton>
      </a>{' '}
    </div>
  )
}

export default AnnouncementModalOptions
