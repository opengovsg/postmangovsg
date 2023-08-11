import cx from 'classnames'

import { useContext } from 'react'

import styles from './CampaignHeaderTabs.module.scss'

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
          className={cx(styles.tab, {
            [styles.active]: activeTab === tabIndex,
          })}
        >
          {tabLabel}
        </span>
      ))}
    </div>
  )
}
