import React, { useContext } from 'react'

import { ModalContext } from 'contexts/modal.context'
import ConfirmModal from 'components/dashboard/confirm-modal'
import { InfoBlock, PrimaryButton } from 'components/common'
import styles from '../Create.module.scss'
import { useParams } from 'react-router-dom'


const EmailSend = ({ id, body, numRecipients, onNext }: { id: number; body: string; numRecipients: number; onNext: (changes: any, next?: boolean) => void }) => {

  const modalContext = useContext(ModalContext)
  const params : { id? : string }= useParams()
  return (
    <>
      <sub>Step 4</sub>
      <h2>Your campaign is ready to be sent!</h2>
      <div className="separator"></div>

      <p>Number of recipients</p>
      <h4>{numRecipients}</h4>

      <p>Message</p>
      <InfoBlock>{body}</InfoBlock>

      <div className="separator"></div>

      <div className="align-right">
        <PrimaryButton className={styles.turquoiseGreenBtn} onClick={() => modalContext.setModalContent(
          <ConfirmModal campaignId={+params.id!}></ConfirmModal>
        )}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
      </div>
    </>
  )
}

export default EmailSend
