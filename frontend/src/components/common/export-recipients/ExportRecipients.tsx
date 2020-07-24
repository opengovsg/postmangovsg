import React, { useState } from 'react'
import cx from 'classnames'
import download from 'downloadjs'

import { Status } from 'classes/Campaign'
import {
  exportCampaignStats,
  CampaignExportStatus,
} from 'services/campaign.service'
import styles from './ExportRecipients.module.scss'
import moment from 'moment'

const ExportRecipients = ({
  campaignId,
  campaignName,
  sentAt,
  exportStatus,
}: {
  className?: string
  campaignId: number
  campaignName: string
  status: Status
  sentAt: Date
  exportStatus: CampaignExportStatus
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

  function renderTitle() {
    switch (exportStatus) {
      case CampaignExportStatus.Unavailable:
        return 'The error list would be available for download after sending is complete'
      case CampaignExportStatus.Loading:
        return 'The error list is being generated and would be available in a few minutes'
      case CampaignExportStatus.Ready:
        return 'Download list of recipients with failed deliveries'
      case CampaignExportStatus.NoError:
        return 'There are no failed deliveries for this campaign'
    }
  }

  function renderExportButton() {
    if (exportStatus === CampaignExportStatus.NoError) {
      return <span className={styles.unavailable}>No error</span>
    }
    if (exportStatus === CampaignExportStatus.Loading) {
      return (
        <>
          <i className={cx(styles.icon, 'bx bx-loader-alt bx-spin')}></i>
          <span>Error list</span>
        </>
      )
    } else {
      const unavailableStyle = {
        [styles.unavailable]: exportStatus === CampaignExportStatus.Unavailable,
      }
      return (
        <>
          <i
            className={cx(styles.icon, unavailableStyle, 'bx bx-download')}
          ></i>
          <span className={cx(unavailableStyle)}>Error list</span>
        </>
      )
    }
  }

  return (
    <div
      className={cx(
        styles.export,
        { [styles.ready]: exportStatus === CampaignExportStatus.Ready },
        { [styles.disabled]: disabled }
      )}
      onClick={(e) =>
        !disabled &&
        exportStatus === CampaignExportStatus.Ready &&
        exportRecipients(e)
      }
      title={renderTitle()}
    >
      {renderExportButton()}
    </div>
  )
}

export default ExportRecipients
