import cx from 'classnames'

import { useContext, useState } from 'react'

import styles from './ConfirmModal.module.scss'

import ConfirmImage from 'assets/img/confirm-modal.svg'

import { PrimaryButton, TextButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

const ConfirmModal = ({
  title,
  subtitle,
  buttonText,
  buttonIcon,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
  disableImage,
}: {
  title: string
  subtitle: string
  buttonText: string
  buttonIcon?: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => Promise<any> | any
  onCancel?: () => Promise<any> | any
  disableImage?: boolean
}) => {
  const modalContext = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')

  async function onConfirmedClicked(): Promise<void> {
    try {
      await onConfirm()
      // Closes the modal
      modalContext.close()
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
          <img src={ConfirmImage} alt="Modal graphic"></img>
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      <h4 className={styles.subtitle}>{subtitle}</h4>
      <div className={styles.options}>
        <PrimaryButton
          className={destructive ? styles.redButton : styles.greenButton}
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
