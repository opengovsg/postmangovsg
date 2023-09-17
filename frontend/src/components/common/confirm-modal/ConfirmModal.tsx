import cx from 'classnames'

import { ReactNode, useContext, useState } from 'react'

import styles from './ConfirmModal.module.scss'

import ConfirmImage from 'assets/img/confirm-modal.svg'

import { PrimaryButton, TextButton, ErrorBlock } from 'components/common'
import FeedbackModal from 'components/common/feedback-modal'
import { AuthContext } from 'contexts/auth.context'
import { ModalContext } from 'contexts/modal.context'

const ConfirmModal = ({
  title,
  subtitle,
  subtitleElement,
  buttonText,
  buttonIcon,
  cancelText,
  primary,
  destructive,
  onConfirm,
  onCancel,
  disableImage,
  alternateImage,
  feedbackUrl,
}: {
  title: string
  subtitle?: string
  subtitleElement?: ReactNode
  buttonText: string
  buttonIcon?: string
  cancelText?: string
  primary?: boolean
  destructive?: boolean
  onConfirm: () => Promise<any> | any
  onCancel?: () => Promise<any> | any
  disableImage?: boolean
  alternateImage?: string
  feedbackUrl?: string
}) => {
  const modalContext = useContext(ModalContext)
  const { email } = useContext(AuthContext)
  const [errorMessage, setErrorMessage] = useState('')

  // feedback modal is built directly into confirm modal as confirm modal is the component that is commonly used across the campaigns
  const openFeedbackModal = () => {
    // just append email at the back
    modalContext.setModalContent(<FeedbackModal url={feedbackUrl + email} />)
  }

  async function onConfirmedClicked(): Promise<void> {
    try {
      await onConfirm()
      // Closes the modal
      if (feedbackUrl) {
        openFeedbackModal()
      } else {
        modalContext.close()
      }
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function onCancelClicked(): Promise<void> {
    try {
      if (onCancel) await onCancel()
      // Closes the modal
      modalContext.close()
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }
  return (
    <div className={styles.confirm}>
      {disableImage ? (
        ''
      ) : (
        <div className={styles.modalImg}>
          <img src={alternateImage ?? ConfirmImage} alt="Modal graphic"></img>
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <h4 className={styles.subtitle}>{subtitle}</h4>}
      {subtitleElement}
      <div className={styles.options}>
        <PrimaryButton
          className={
            primary
              ? styles.blueButton
              : destructive
              ? styles.redButton
              : styles.greenButton
          }
          onClick={onConfirmedClicked}
        >
          {buttonText}
          {buttonIcon && <i className={cx('bx', styles.icon, buttonIcon)}></i>}
        </PrimaryButton>
        {cancelText && (
          <TextButton minButtonWidth onClick={onCancelClicked}>
            {cancelText}
          </TextButton>
        )}
      </div>
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </div>
  )
}

export default ConfirmModal
