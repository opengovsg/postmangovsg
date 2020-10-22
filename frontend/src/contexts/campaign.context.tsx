import React, { createContext, useState, SetStateAction, Dispatch } from 'react'
import { SMSCampaign, EmailCampaign, TelegramCampaign, Campaign } from 'classes'

interface ContextProps {
  campaign: SMSCampaign | EmailCampaign | TelegramCampaign
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

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        setCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export default CampaignContextProvider
