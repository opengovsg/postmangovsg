import { useContext } from 'react'

import { GovsgDetailContext } from 'contexts/govsg-detail.context'

export const CampaignHeaderTabs = () => {
  const { setActiveTab } = useContext(GovsgDetailContext)
  const tabLabels = ['Report', 'Messages']
  return (
    <div>
      {tabLabels.map((tabLabel, tabIndex) => (
        <span key={tabLabel} onClick={() => setActiveTab(tabIndex)}>
          {tabLabel}
        </span>
      ))}
    </div>
  )
}
