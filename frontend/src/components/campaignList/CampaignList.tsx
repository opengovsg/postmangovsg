import React from 'react'

import Pagination from 'components/common/pagination'
import styles from './CampaignList.module.scss'

const CampaignList = (props: any) => {
  return (
    <div className={[styles.campaignList, "container"].join(' ')}>
      <h3 className={styles.title}>{props.campaigns.length} past campaigns</h3>

      <div className={styles.table}>
        <div className={["columns", styles.header].join(' ')}>
          <p className="column">Mode</p>
          <p className="column">Name</p>
          <p className="column">Time Sent</p>
          <p className="column">Messages Sent</p>
          <p className="column">Status</p>
        </div>

        {
          props.campaigns.map((item: any) => 
            <div className={["columns", styles.rows].join(' ')}>
              <p className="column">{item.Mode}</p>
              <p className="column">{item.Name}</p>
              <p className="column">{item['Time Sent']}</p>
              <p className="column">{item['Messages Sent']}</p>
              <p className="column">{item.Status}</p>
            </div>  
          )
        }
      </div>

      <Pagination itemsCount={props.campaigns.length}></Pagination>
    </div>
  )
}

export default CampaignList