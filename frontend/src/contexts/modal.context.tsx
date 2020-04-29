import React, { createContext, useState, Dispatch, SetStateAction } from 'react'
import Modal from 'components/common/modal'

const defaultValue = {
  setModalContent: {} as Dispatch<SetStateAction<any>>,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)

  return (
    <ModalContext.Provider value={{ setModalContent }}>
      <Modal onClose={() => setModalContent(null)}>{modalContent}</Modal>
      {children}
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
