import React, { useState } from 'react'
import cx from 'classnames'

import { Status } from 'classes/Campaign'
import {
  getCampaignInvalidRecipients,
  getCampaignStats,
} from 'services/campaign.service'
import styles from './InvalidRecipientsCsv.module.scss'

const LINK_DISPLAY_WAIT_TIME = 5 * 60 * 1000

const InvalidRecipientsCsv = ({
  campaignId,
  campaignName,
  status,
  sentAt,
  updatedAt,
  error,
}: {
  campaignId: number
  campaignName: string
  status: Status
  sentAt: Date
  updatedAt: Date
  error?: number
}) => {
  const updatedAtTimestamp = +new Date(updatedAt)
  const campaignAge = Date.now() - updatedAtTimestamp
  const [errorCount, setErrorCount] = useState(error)

  async function getErrorCount() {
    const { error } = await getCampaignStats(campaignId)
    setErrorCount(error)
  }

  async function onDownloadInvalidRecipientsList(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) {
    event.stopPropagation()
    const list = await getCampaignInvalidRecipients(campaignId)
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
    if (!error) {
      getErrorCount()
    }
    // call stats endpoint to retrieve error count when error stats not found i.e. in campaigns list

    return errorCount ? (
      <div
        className={styles.invalidRecipients}
        onClick={(e) => onDownloadInvalidRecipientsList(e)}
      >
        <i className={cx(styles.icon, 'bx bx-download')}></i>
        Recipients
      </div>
    ) : null
  }

  return null
}

export default InvalidRecipientsCsv
