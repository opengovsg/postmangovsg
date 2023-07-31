import {
  createContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'

interface GovsgDetailContextProps {
  activeTab: number
  setActiveTab: Dispatch<SetStateAction<number>>
}

export const GovsgDetailContext = createContext({
  activeTab: 0,
} as GovsgDetailContextProps)

export const GovsgDetailContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <GovsgDetailContext.Provider
      value={{
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </GovsgDetailContext.Provider>
  )
}
