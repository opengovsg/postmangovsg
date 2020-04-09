import React, { useState, useContext, Children } from 'react'
import cx from 'classnames'

import { ModalContext } from 'contexts/modal.context'
import { ChannelType } from 'classes/Campaign'
import { PrimaryButton, TextInput } from 'components/common'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelopeOpen, faEnvelopeOpenText, faArrowRight, faTimes } from '@fortawesome/free-solid-svg-icons'
import ModalImage from 'assets/img/modal.png'
import styles from './Modal.module.scss'

const Modal = () => {
  const modalContext = useContext(ModalContext)
  
  const handleCloseModal = () => {
    modalContext.setModalOpen(false)
  }

  const confirmation = (
    <>
      <div className={styles.modalImg}>
        <img src={ModalImage} alt="Modal graphic"></img>
      </div>
      <h2 className={styles.title}>Are you absolutely sure?</h2>
      <h4>Sending out a campaign is irreversible.</h4>
      <PrimaryButton className={styles.button}>Confirm send now</PrimaryButton>
    </>
  )

  return (
    <>
      {
        modalContext.modalOpen &&
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <FontAwesomeIcon 
              onClick={handleCloseModal}
              className={cx(styles.icon, styles.close)} 
              icon={faTimes}
            />
            {/* { confirmation } */}
            {/* { create } */}
            {modalContext.modalContent}
          </div>
        </div>
      }
    </>
  )
}

export default Modal