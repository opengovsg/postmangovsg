import React, { createContext, useState, Dispatch, SetStateAction } from 'react'
import Modal from 'components/common/modal'
import BodyWrapper from 'components/common/body-wrapper'

const defaultValue = {
  setModalContent: {} as Dispatch<SetStateAction<any>>,
  close: {} as () => void,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)

  function handleClose() {
    setModalContent(null)
  }

  return (
    <ModalContext.Provider value={{ setModalContent, close: handleClose }}>
      <Modal onClose={handleClose}>{modalContent}</Modal>
      <BodyWrapper wrap={!!modalContent}>{children}</BodyWrapper>
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
