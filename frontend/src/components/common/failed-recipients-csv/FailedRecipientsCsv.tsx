import React, { useState } from 'react'
import cx from 'classnames'

import { Status } from 'classes/Campaign'
import {
  exportCampaignStats,
  getCampaignStats,
} from 'services/campaign.service'
import styles from './FailedRecipientsCsv.module.scss'
import { stat } from 'fs'

const LINK_DISPLAY_WAIT_TIME = 5 * 60 * 1000

const FailedRecipientsCsv = ({
  campaignId,
  campaignName,
  status,
  sentAt,
  updatedAt,
  failedCount: initialFailedCount,
  shortLabel = false,
}: {
  campaignId: number
  campaignName: string
  status: Status
  sentAt: Date
  updatedAt: Date
  failedCount?: number
  shortLabel?: boolean
}) => {
  const updatedAtTimestamp = +new Date(updatedAt)
  const campaignAge = Date.now() - updatedAtTimestamp
  const [failedCount, setFailedCount] = useState(initialFailedCount)

  async function getFailedCount() {
    const { error, invalid } = await getCampaignStats(campaignId)
    setFailedCount(error + invalid)
  }

  async function onDownloadInvalidRecipientsList(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    event.stopPropagation()
    const list = await exportCampaignStats(campaignId)
    console.log(list)
    const headers = Object.keys(list[0])
    const sentAtTime = new Date(sentAt)

    const content = [
      `data:text/csv;charset=utf-8,${headers.join(',')}`,
      `${list.map((row) => Object.values(row).join(','))}`,
    ].join('\n')
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
  }

  if (status === Status.Sent && campaignAge > LINK_DISPLAY_WAIT_TIME) {
    if (!failedCount) {
      // call stats endpoint to retrieve failed messages count when stats not found i.e. in campaigns list
      getFailedCount()
    }

    return failedCount ? (
      <div
        className={styles.invalidRecipients}
        onClick={(e) => onDownloadInvalidRecipientsList(e)}
      >
        <i className={cx(styles.icon, 'bx bx-download')}></i>
        {shortLabel ? 'Export' : 'Export error and invalid recipients list'}
      </div>
    ) : null
  }

  return null
}

export default FailedRecipientsCsv
