import React, { createContext, useState, useEffect } from 'react'
import { getCampaigns } from 'services/campaign.service'

const ITEMS_PER_PAGE = 1

const defaultValue = {
  campaigns: [],
  setCampaigns: {},
  // Pagination
  pageCount: 1,
  setPageCount: {}, 
  campaignsDisplayed: [],
  setCampaignsDisplayed: {},
  selectedPage: 0,
  setSelectedPage: (page: number) => {}
}

export const CampaignContext = createContext(defaultValue)

const CampaignContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState([])
  const [campaignsDisplayed, setCampaignsDisplayed] = useState([])
  const [selectedPage, setSelectedPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  async function fetchCampaigns() {
    const campaigns = await getCampaigns()
    setCampaigns(campaigns)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  useEffect(() => {
    setPageCount(campaigns.length / ITEMS_PER_PAGE)
    setCampaignsDisplayed(campaigns.slice(0, ITEMS_PER_PAGE))
  }, [campaigns])

  useEffect(() => {
    const offset = selectedPage * ITEMS_PER_PAGE
    setCampaignsDisplayed(campaigns.slice(offset, offset + ITEMS_PER_PAGE))
  }, [selectedPage])

  return (
    <CampaignContext.Provider value={{
      campaigns,
      setCampaigns,
      campaignsDisplayed,
      setCampaignsDisplayed,
      selectedPage,
      setSelectedPage,
      pageCount,
      setPageCount
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export default CampaignContextProvider
