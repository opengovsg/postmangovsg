import React, { createContext, useState, useEffect } from 'react'
import { getCampaigns } from 'services/campaign.service'

const defaultValue = {
  campaigns: [],
  setCampaigns: {},
}

export const CampaignContext = createContext(defaultValue)

const CampaignContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState([])

  async function fetchCampaigns() {
    const campaigns = await getCampaigns()
    setCampaigns(campaigns)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  return (
    <CampaignContext.Provider value={{
      campaigns,
      setCampaigns
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export default CampaignContextProvider
