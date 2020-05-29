import React from 'react'
import cx from 'classnames'

import { Status } from 'classes/Campaign'
import { getCampaignInvalidRecipients, getCampaignStats } from 'services/campaign.service'
import styles from './InvalidRecipientsCsv.module.scss'

const LINK_DISPLAY_WAIT_TIME = 5 * 60 * 1000
const InvalidRecipientsCsv = ({ campaignId, campaignName, status, sentAt, updatedAt, error }:
  { campaignId: number; campaignName: string; status: Status; sentAt: Date; updatedAt: Date; error?: number }) => {
  const updatedAtTimestamp = +new Date(updatedAt)
  const campaignAge = Date.now() - updatedAtTimestamp

  async function getErrorCount() {
    const { error } = await getCampaignStats(campaignId)
    return error
  }

  async function onDownloadInvalidRecipientsList(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.stopPropagation()
    const list = await getCampaignInvalidRecipients(campaignId)
    const headers = Object.keys(list)
    const sentAtTime = new Date(sentAt)

    const content = [
      `data:text/csv;charset=utf-8,${headers.join(',')}`,
      `${list.join(',')}`,
    ].join('\n')
    const encodedUri = encodeURI(content)

    // Trigger file download
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${campaignName}_${sentAtTime.toLocaleDateString()}_${sentAtTime.toLocaleTimeString()}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  if (status === Status.Sent && campaignAge > LINK_DISPLAY_WAIT_TIME) {
    const errorCount = error || 0
    // call stats endpoint to retrieve error count when error stats not found i.e. in campaigns list
    if (!error) {
      getErrorCount()
    }

    return errorCount > 0
      ? (
        <div className={styles.invalidRecipients} onClick={e => onDownloadInvalidRecipientsList(e)}>
          <i className={cx(styles.icon, 'bx bx-download')}></i>
        Recipients
        </div>
      )
      : null
  }

  return null
}

export default InvalidRecipientsCsv
