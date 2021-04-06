import React, { createContext, useState } from 'react'
import Modal from 'components/common/modal'
import BodyWrapper from 'components/common/body-wrapper'

import type { Dispatch, SetStateAction } from 'react'

const defaultValue = {
  modalContent: null as any,
  setModalContent: {} as Dispatch<SetStateAction<any>>,
  setModalTitle: {} as Dispatch<SetStateAction<any>>,
  setBeforeClose: {} as Dispatch<SetStateAction<any>>,
  close: {} as () => void,
}

export const ModalContext = createContext(defaultValue)

const ModalContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalContent, setModalContent] = useState(null)
  const [modalTitle, setModalTitle] = useState('')

  // Important: to pass a function into setBeforeClose, you must anonymize it twice
  // i.e `() => () => { some function }
  // see: https://medium.com/swlh/how-to-store-a-function-with-the-usestate-hook-in-react-8a88dd4eede1
  const [beforeClose, setBeforeClose] = useState<(() => Promise<void>) | null>(
    null
  )

  async function handleClose() {
    if (beforeClose) {
      try {
        await beforeClose()
      } catch (e) {
        console.error(e)
      }
      setBeforeClose(null)
    }
    setModalContent(null)
    setModalTitle('')
  }

  return (
    <ModalContext.Provider
      value={{
        modalContent,
        setModalContent,
        close: handleClose,
        setModalTitle,
        setBeforeClose: setBeforeClose,
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
