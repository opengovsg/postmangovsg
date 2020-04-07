import React, { useContext } from 'react'

import Pagination from 'components/common/pagination'
import { CampaignContext } from 'contexts/campaign.context'
import styles from './Campaigns.module.scss'

const Campaigns = () => {
  const campaignContext = useContext(CampaignContext)
  const { campaigns, campaignsDisplayed } = campaignContext

  return (
    <div className={styles.content}>
      <h3 className={styles.title}>{campaigns.length} past campaigns</h3>

      {
        campaigns.length
          ? (
            <>
              <div className={styles.table}>
                <div className={[styles.row, styles.header].join(' ')}>
                  <p className={styles.column}>Mode</p>
                  <p className={styles.column}>Name</p>
                  <p className={styles.column}>Time Sent</p>
                  <p className={styles.column}>Messages Sent</p>
                  <p className={styles.column}>Status</p>
                </div>

                {
                  campaignsDisplayed.map((item: any, index: number) => 
                    <div className={[styles.row, styles.body].join(' ')} key={index}>
                      <p className={styles.column}>{item.Mode}</p>
                      <p className={styles.column}>{item.Name}</p>
                      <p className={styles.column}>{item['Time Sent']}</p>
                      <p className={styles.column}>{item['Messages Sent']}</p>
                      <p className={styles.column}>{item.Status}</p>
                    </div>  
                  )
                }
              </div>

              <Pagination></Pagination>
            </>
          )
          : ''
      }
    </div>
  )
}

export default Campaigns
