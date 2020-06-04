import React, { createContext, useState, Dispatch, SetStateAction } from 'react'
import Modal from 'components/common/modal'
import BodyWrapper from 'components/common/body-wrapper'

const defaultValue = {
  setModalContent: {} as Dispatch<SetStateAction<any>>,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)

  return (
    <ModalContext.Provider value={{ setModalContent }}>
      <Modal onClose={() => setModalContent(null)}>{modalContent}</Modal>
      <BodyWrapper wrap={!!modalContent}>{children}</BodyWrapper>
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
