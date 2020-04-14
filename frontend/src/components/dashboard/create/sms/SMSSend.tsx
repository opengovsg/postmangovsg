import React, { useContext } from 'react'

import { ModalContext } from 'contexts/modal.context'
import ConfirmModal from 'components/dashboard/confirm-modal'
import { InfoBlock, PrimaryButton } from 'components/common'
const SMSSend = ({ body, numRecipients }: { body: string; numRecipients: number }) => {

  const modalContext = useContext(ModalContext)

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
        <PrimaryButton onClick={() => modalContext.setModalContent(
          <ConfirmModal></ConfirmModal>
        )}>
          Send campaign now
          <i className="bx bx-send"></i>
        </PrimaryButton>
      </div>
    </>
  )
}

export default SMSSend
