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
                <div className={["columns", styles.header].join(' ')}>
                  <p className="column">Mode</p>
                  <p className="column">Name</p>
                  <p className="column">Time Sent</p>
                  <p className="column">Messages Sent</p>
                  <p className="column">Status</p>
                </div>

                {
                  campaignsDisplayed.map((item: any, index: number) => 
                    <div className={["columns", styles.rows].join(' ')} key={index}>
                      <p className="column">{item.Mode}</p>
                      <p className="column">{item.Name}</p>
                      <p className="column">{item['Time Sent']}</p>
                      <p className="column">{item['Messages Sent']}</p>
                      <p className="column">{item.Status}</p>
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
