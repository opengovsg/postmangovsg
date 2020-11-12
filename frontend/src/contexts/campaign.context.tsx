import React, {
  createContext,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react'
import { cloneDeep } from 'lodash'
import { SMSCampaign, EmailCampaign, TelegramCampaign, Campaign } from 'classes'

interface ContextProps {
  campaign: SMSCampaign | EmailCampaign | TelegramCampaign
  updateCampaign: (
    changes: Partial<SMSCampaign | EmailCampaign | TelegramCampaign>
  ) => void
  setCampaign: Dispatch<
    SetStateAction<SMSCampaign | EmailCampaign | TelegramCampaign>
  >
}

export const CampaignContext = createContext({} as ContextProps)

const CampaignContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [campaign, setCampaign] = useState(
    new Campaign({}) as SMSCampaign | EmailCampaign | TelegramCampaign
  )

  function updateCampaign(
    changes: Partial<SMSCampaign | EmailCampaign | TelegramCampaign>
  ) {
    setCampaign((c) => {
      const updatedCampaign = Object.assign(cloneDeep(c), changes) as
        | SMSCampaign
        | EmailCampaign
        | TelegramCampaign
      updatedCampaign.setProgress()
      return updatedCampaign
    })
  }

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        updateCampaign: useCallback(updateCampaign, []),
        setCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export default CampaignContextProvider
