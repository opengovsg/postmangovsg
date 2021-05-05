import React, { createContext, useState, useCallback } from 'react'
import { cloneDeep } from 'lodash'
import { SMSCampaign, EmailCampaign, TelegramCampaign, Campaign } from 'classes'

import type { Dispatch, SetStateAction } from 'react'

type PossibleCampaign = SMSCampaign | EmailCampaign | TelegramCampaign

interface ContextProps {
  campaign: PossibleCampaign
  updateCampaign: (changes: Partial<PossibleCampaign>) => void
  setCampaign: Dispatch<SetStateAction<PossibleCampaign>>
}

export const CampaignContext = createContext({} as ContextProps)

const CampaignContextProvider = ({
  children,
  initialCampaign = new Campaign({}) as PossibleCampaign,
}: {
  children: React.ReactNode
  initialCampaign?: PossibleCampaign
}) => {
  const [campaign, setCampaign] = useState(initialCampaign)

  function updateCampaign(changes: Partial<PossibleCampaign>) {
    setCampaign((c) => {
      const updatedCampaign = Object.assign(
        cloneDeep(c),
        changes
      ) as PossibleCampaign
      updatedCampaign.setProgress()
      return updatedCampaign
    })
  }

  return (
    <CampaignContext.Provider
      value={{
        campaign,
        // updateCampaign is re-created for every re-render of CampaignContextProvider
        // Memoise updateCampaign to prevent unnecessary renders in subscribers when
        // defined as dependencies in useEffect
        updateCampaign: useCallback(updateCampaign, []),
        setCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export default CampaignContextProvider
