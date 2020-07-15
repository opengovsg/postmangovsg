import React, { useState } from 'react'
import cx from 'classnames'
import download from 'downloadjs'

import { Status } from 'classes/Campaign'
import { exportCampaignStats } from 'services/campaign.service'
import styles from './ExportRecipients.module.scss'
import moment from 'moment'

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
      const headers = Object.keys(list[0]).map((key) => `"${key}"`)
      const sentAtTime = new Date(sentAt)
      const explanation = `"This report was exported on ${moment()
        .format('LLL')
        .replace(
          ',',
          ''
        )} and can change in the future when Postman receives notifications about the sent messages."\n`
      const content = [explanation, `${headers.join(',')}\n`].concat(
        list.map((row) => {
          const values = Object.values(row)
          return `${values.map((value) => `"${value}"`).join(',')}\n`
        })
      )

      download(
        new Blob(content),
        `${campaignName}_${sentAtTime.toLocaleDateString()}_${sentAtTime.toLocaleTimeString()}.csv`,
        'text/csv'
      )
    } catch (error) {
      console.error(error)
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
