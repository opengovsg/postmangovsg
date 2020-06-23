import React from 'react'
import cx from 'classnames'

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

      const content = [`data:text/csv;charset=utf-8,${headers.join(',')}`]
        .concat(list.map((row) => Object.values(row).join(',')))
        .join('\n')
      const encodedUri = encodeURI(content)

      // Trigger file download
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `${campaignName}_${sentAtTime.toLocaleDateString()}_${sentAtTime.toLocaleTimeString()}.csv`
      )
      document.body.appendChild(link)
      link.click()
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
