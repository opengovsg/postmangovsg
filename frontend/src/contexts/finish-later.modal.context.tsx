import { createContext, useState, useContext } from 'react'
import * as React from 'react'
import { ModalContext } from 'contexts/modal.context'

import type { Dispatch, SetStateAction } from 'react'

interface ContextProps {
  handleFinishLater: () => void
  finishLaterContent: React.ReactNode
  setFinishLaterContent: Dispatch<SetStateAction<any>>
}

export const FinishLaterModalContext = createContext({} as ContextProps)

const FinishLaterModalContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { setModalContent } = useContext(ModalContext)
  const [finishLaterContent, setFinishLaterContent] = useState(null)

  const handleFinishLater = () => setModalContent(finishLaterContent)

  return (
    <FinishLaterModalContext.Provider
      value={{ handleFinishLater, finishLaterContent, setFinishLaterContent }}
    >
      {children}
    </FinishLaterModalContext.Provider>
  )
}

export default FinishLaterModalContextProvider
