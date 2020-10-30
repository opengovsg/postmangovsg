import React, { createContext, useState, Dispatch, SetStateAction } from 'react'
import Modal from 'components/common/modal'
import BodyWrapper from 'components/common/body-wrapper'

const defaultValue = {
  setModalContent: {} as Dispatch<SetStateAction<any>>,
  setModalContentClass: {} as Dispatch<SetStateAction<string>>,
  close: {} as () => void,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)
  const [modalContentClass, setModalContentClass] = useState('')

  function handleClose() {
    setModalContent(null)
    setModalContentClass('')
  }

  return (
    <ModalContext.Provider
      value={{ setModalContent, setModalContentClass, close: handleClose }}
    >
      <Modal contentClassName={modalContentClass} onClose={handleClose}>
        {modalContent}
      </Modal>
      <BodyWrapper wrap={!!modalContent}>{children}</BodyWrapper>
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
