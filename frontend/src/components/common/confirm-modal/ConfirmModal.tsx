import React, { useContext, useState } from 'react'
import cx from 'classnames'

import { PrimaryButton, TextButton, ErrorBlock } from 'components/common'
import { ModalContext } from 'contexts/modal.context'

import ConfirmImage from 'assets/img/confirm-modal.svg'
import styles from './ConfirmModal.module.scss'

const ConfirmModal = ({
  title,
  subtitle,
  buttonText,
  buttonIcon,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  subtitle: string
  buttonText: string
  buttonIcon?: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => Promise<any> | any
  onCancel?: () => Promise<any> | any
}) => {
  const modalContext = useContext(ModalContext)
  const [errorMessage, setErrorMessage] = useState('')

  async function onConfirmedClicked(): Promise<void> {
    try {
      await onConfirm()
      // Closes the modal
      modalContext.close()
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  async function onCancelClicked(): Promise<void> {
    try {
      if (onCancel) await onCancel()
      // Closes the modal
      modalContext.close()
    } catch (err) {
      setErrorMessage(err.message)
    }
  }
  return (
    <div className={styles.confirm}>
      <div className={styles.modalImg}>
        <img src={ConfirmImage} alt="Modal graphic"></img>
      </div>
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
