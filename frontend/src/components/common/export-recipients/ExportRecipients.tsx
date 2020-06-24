import React from 'react'
import cx from 'classnames'
import download from 'downloadjs'

import { Status } from 'classes/Campaign'
import { exportCampaignStats } from 'services/campaign.service'
import styles from './ExportRecipients.module.scss'

const ExportRecipients = ({
  campaignId,
  campaignName,
  sentAt,
}: {
  campaignId: number
  campaignName: string
  status: Status
  sentAt: Date
}) => {
  async function exportRecipients(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    try {
      event.stopPropagation()
      const list = await exportCampaignStats(campaignId)
      const headers = Object.keys(list[0])
      const sentAtTime = new Date(sentAt)

      const content = [`${headers.join(',')}`]
        .concat(list.map((row) => Object.values(row).join(',')))
        .join('\n')

      download(
        content,
        `${campaignName}_${sentAtTime.toLocaleDateString()}_${sentAtTime.toLocaleTimeString()}.csv`,
        'text/csv'
      )
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div onClick={(e) => exportRecipients(e)}>
      Export
      <i className={cx(styles.icon, 'bx bx-export')}></i>
    </div>
  )
}

export default ExportRecipients
