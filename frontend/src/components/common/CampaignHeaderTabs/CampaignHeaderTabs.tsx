import { useContext } from 'react'

import { GovsgDetailContext } from 'contexts/govsg-detail.context'

export const CampaignHeaderTabs = () => {
  const { activeTab, setActiveTab } = useContext(GovsgDetailContext)
  const tabLabels = ['Report', 'Messages']
  return (
    <div>
      {tabLabels.map((tabLabel, tabIndex) => (
        <span
          key={tabLabel}
          onClick={() => setActiveTab(tabIndex)}
          style={
            activeTab === tabIndex
              ? { marginRight: '1rem', fontWeight: 'bold', color: '#2C2CDC' }
              : { marginRight: '1rem' }
          }
        >
          {tabLabel}
        </span>
      ))}
    </div>
  )
}
