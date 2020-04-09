import React, { createContext, useState } from 'react'

const defaultValue = {
  modalOpen: false,
  setModalOpen: (open: boolean) => {},
  modalContent: <div />,
  // setModalContent: ({type}:{type:string}) => void
  setModalContent: (content: any) => {},
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(<div />)

  return (
    <ModalContext.Provider value={{
      modalOpen,
      setModalOpen,
      modalContent,
      setModalContent,
    }}>
      {children}
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
