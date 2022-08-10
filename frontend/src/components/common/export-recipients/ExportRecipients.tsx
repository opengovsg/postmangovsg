import cx from 'classnames'

import download from 'downloadjs'
import moment from 'moment'
import { useState, useEffect } from 'react'

import type { MouseEvent as ReactMouseEvent } from 'react'

import styles from './ExportRecipients.module.scss'

import type { ChannelType } from 'classes/Campaign'
import { Status } from 'classes/Campaign'
import { ActionButton } from 'components/common'
import { exportCampaignStats } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

export enum CampaignExportStatus {
  Unavailable = 'Unavailable',
  Loading = 'Loading',
  Ready = 'Ready',
  Exporting = 'Exporting',
}

const EXPORT_LINK_DISPLAY_WAIT_TIME = 1 * 60 * 1000 // 1 min

const ExportRecipients = ({
  campaignId,
  campaignName,
  campaignType,
  sentAt,
  status,
  statusUpdatedAt,
  iconPosition,
  isButton = false,
}: {
  campaignId: number
  campaignName: string
  campaignType: ChannelType
  sentAt?: string
  status: Status
  statusUpdatedAt?: string
  iconPosition: 'left' | 'right'
  isButton?: boolean
}) => {
  const [exportStatus, setExportStatus] = useState(
    CampaignExportStatus.Unavailable
  )
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    function getExportStatus(): void {
      if (status === Status.Sending || !statusUpdatedAt) {
        return setExportStatus(CampaignExportStatus.Unavailable)
      }

      const updatedAtTimestamp = +new Date(statusUpdatedAt)
      const campaignAge = Date.now() - updatedAtTimestamp
      if (campaignAge <= EXPORT_LINK_DISPLAY_WAIT_TIME) {
        // poll export status until it has reached finalised status (Ready)
        timeoutId = setTimeout(getExportStatus, 2000)
        return setExportStatus(CampaignExportStatus.Loading)
      }

      if (exportStatus !== CampaignExportStatus.Exporting) {
        setExportStatus(CampaignExportStatus.Ready)
      }
    }

    getExportStatus()
    return () => {
      timeoutId && clearTimeout(timeoutId)
    }
  })

  async function exportRecipients(
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) {
    try {
      event.stopPropagation()
      setDisabled(true)
      setExportStatus(CampaignExportStatus.Exporting)

      const list = await exportCampaignStats(campaignId, campaignType)

      const exportedAt = moment().format('LLL').replace(',', '')
      const explanation =
        `"Exported ${exportedAt}. Reports are updated as and when Postman receives new notifications about message status."\n` +
        `"'Read' status may not show up accurately for corporate and Singapore government recipients due to email filtering policies."\n\n`

      let content = [explanation]

      // Handle the edge case where the display wait time is reached but none of the status are updated yet in the message table.
      if (list.length > 0) {
        const headers = Object.keys(list[0])
          .map((key) => `"${key}"`)
          .join(',')
          .concat('\n')

        const recipients = list.map((row) => {
          const values = Object.values(row)
          return `${values.map((value) => `"${value}"`).join(',')}\n`
        })

        content = content.concat(headers, recipients)
      } else {
        const emptyExplanation = `"Finalised delivery statuses for your messages are not yet available, try exporting again later."\n`
        content = content.concat(emptyExplanation)
      }

      let sentAtTime
      if (!sentAt) {
        console.error(
          'sentAt is undefined. Using current Date() as a fallback.'
        )
        sentAtTime = new Date()
      } else {
        sentAtTime = new Date(sentAt)
      }

      download(
        new Blob(content),
        `${campaignName}_${sentAtTime.toLocaleDateString()}_${sentAtTime.toLocaleTimeString()}.csv`,
        'text/csv'
      )

      setExportStatus(CampaignExportStatus.Ready)

      const campaignAgeInDays = moment().diff(sentAt, 'days')
      sendUserEvent(
        GA_USER_EVENTS.DOWNLOAD_DELIVERY_REPORT,
        campaignType,
        campaignAgeInDays
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
        return 'The delivery report will be available for download after sending is complete'
      case CampaignExportStatus.Loading:
        return 'The delivery report is being generated and will be available in a few minutes'
      case CampaignExportStatus.Exporting:
        return 'The delivery report is being exported and the download will begin shortly'
      case CampaignExportStatus.Ready:
        return 'Download delivery report'
    }
  }

  function renderExportButtonContent() {
    switch (exportStatus) {
      case CampaignExportStatus.Loading:
      case CampaignExportStatus.Exporting:
        return (
          <>
            <i className={cx(styles.icon, 'bx bx-loader-alt bx-spin')}></i>
            <span>Report</span>
          </>
        )
      case CampaignExportStatus.Unavailable:
      case CampaignExportStatus.Ready:
        return (
          <>
            <i className={cx(styles.icon, 'bx bx-download')}></i>
            <span>Report</span>
          </>
        )
    }
  }

  function renderExportButton() {
    return (
      <div
        className={cx(
          styles.export,
          { [styles.ready]: exportStatus === CampaignExportStatus.Ready },
          { [styles.unavailable]: exportStatus !== CampaignExportStatus.Ready },
          { [styles.disabled]: disabled }
        )}
        onClick={(e) =>
          !disabled &&
          exportStatus === CampaignExportStatus.Ready &&
          exportRecipients(e)
        }
        title={renderTitle()}
      >
        <div className={styles[iconPosition]}>
          {renderExportButtonContent()}
        </div>
      </div>
    )
  }

  return (
    <>
      {isButton ? (
        <div className={styles.actionButton}>
          <strong>
            Delivery report will expire 30 days after sending is completed.
          </strong>
          <ActionButton
            disabled={exportStatus !== CampaignExportStatus.Ready}
            className={cx(styles.exportButton, {
              [styles.disableActiveState]:
                exportStatus === CampaignExportStatus.Loading,
            })}
          >
            {renderExportButton()}
          </ActionButton>
        </div>
      ) : (
        renderExportButton()
      )}
    </>
  )
}

export default ExportRecipients
