import React, { useContext } from 'react'

import Pagination from 'components/common/pagination'
import { CampaignContext } from 'contexts/campaign.context'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelopeOpen, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons'
import styles from './Campaigns.module.scss'

const Campaigns = () => {
  const campaignContext = useContext(CampaignContext)
  const { campaigns, campaignsDisplayed } = campaignContext

  const modeIcons: any = {
    email: (
      <FontAwesomeIcon className={styles.icon} icon={faEnvelopeOpen} />
    ),
    sms: (
      <FontAwesomeIcon className={styles.icon} icon={faEnvelopeOpenText} />
    )
  }

  return (
    <div className={styles.content}>
      <h2 className={styles.title}>{campaigns.length} past campaigns</h2>

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
                      <div className={styles.column}>
                        <span className={styles.icon}>{modeIcons[item.Mode]}</span>
                      </div>
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
