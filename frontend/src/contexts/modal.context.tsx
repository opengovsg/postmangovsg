import React, { createContext, useState, Dispatch, SetStateAction } from 'react'
import Modal from 'components/common/modal'
import BodyWrapper from 'components/common/body-wrapper'

const defaultValue = {
  setModalContent: {} as Dispatch<SetStateAction<any>>,
  setModalTitle: {} as Dispatch<SetStateAction<any>>,
  setCustomClose: {} as Dispatch<SetStateAction<any>>,
  close: {} as () => void,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)
  const [modalTitle, setModalTitle] = useState('')
  const [customClose, setCustomClose] = useState<(() => {}) | null>(null)

  function handleClose() {
    if (customClose) {
      customClose()
      setCustomClose(null)
    }
    console.log('modal context handle close')
    setModalContent(null)
    setModalTitle('')
  }

  return (
    <ModalContext.Provider
      value={{
        setModalContent,
        close: handleClose,
        setModalTitle,
        setCustomClose,
      }}
    >
      <Modal onClose={handleClose} modalTitle={modalTitle}>
        {modalContent}
      </Modal>
      <BodyWrapper wrap={!!modalContent}>{children}</BodyWrapper>
    </ModalContext.Provider>
  )
}

export default ModalContextProvider
