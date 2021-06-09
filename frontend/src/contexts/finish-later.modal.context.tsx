import { createContext, useState, useContext } from 'react'

import type { ReactNode, Dispatch, SetStateAction } from 'react'

import { ModalContext } from 'contexts/modal.context'

interface ContextProps {
  handleFinishLater: () => void
  finishLaterContent: ReactNode
  setFinishLaterContent: Dispatch<SetStateAction<any>>
}

export const FinishLaterModalContext = createContext({} as ContextProps)

const FinishLaterModalContextProvider = ({
  children,
}: {
  children: ReactNode
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
