import React, { useState } from 'react'
import cx from 'classnames'
import download from 'downloadjs'

import { Status } from 'classes/Campaign'
import { exportCampaignStats } from 'services/campaign.service'
import styles from './ExportRecipients.module.scss'

const ExportRecipients = ({
  className,
  campaignId,
  campaignName,
  sentAt,
}: {
  className?: string
  campaignId: number
  campaignName: string
  status: Status
  sentAt: Date
}) => {
  const [disabled, setDisabled] = useState(false)
  async function exportRecipients(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    try {
      event.stopPropagation()
      setDisabled(true)
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
    } finally {
      setDisabled(false)
    }
  }

  return (
    <div
      className={cx(className, { [styles.disabled]: disabled })}
      onClick={(e) => !disabled && exportRecipients(e)}
    >
      <span>Export</span>
      <i className={cx(styles.icon, 'bx bx-export')}></i>
    </div>
  )
}

export default ExportRecipients
