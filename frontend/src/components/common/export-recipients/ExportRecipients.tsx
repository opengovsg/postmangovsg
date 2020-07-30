import React, { useState, useEffect } from 'react'
import cx from 'classnames'
import download from 'downloadjs'

import { Status } from 'classes/Campaign'
import { ActionButton } from 'components/common'
import { exportCampaignStats } from 'services/campaign.service'
import styles from './ExportRecipients.module.scss'
import moment from 'moment'

export enum CampaignExportStatus {
  Unavailable = 'Unavailable',
  Loading = 'Loading',
  Ready = 'Ready',
  NoError = 'No Error',
}

const EXPORT_LINK_DISPLAY_WAIT_TIME = 1 * 60 * 1000 // 1 min

const ExportRecipients = ({
  campaignId,
  campaignName,
  sentAt,
  status,
  updatedAt,
  hasFailedRecipients,
  iconPosition,
  isButton = false,
}: {
  campaignId: number
  campaignName: string
  sentAt: Date
  status: Status
  updatedAt: Date
  hasFailedRecipients: boolean
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
      if (status === Status.Sending) {
        return setExportStatus(CampaignExportStatus.Unavailable)
      }

      const updatedAtTimestamp = +new Date(updatedAt)
      const campaignAge = Date.now() - updatedAtTimestamp
      console.log(campaignAge)
      if (campaignAge <= EXPORT_LINK_DISPLAY_WAIT_TIME) {
        // poll export status until it has reached finalised status (Ready or No Error)
        timeoutId = setTimeout(getExportStatus, 2000)
        return setExportStatus(CampaignExportStatus.Loading)
      }

      return setExportStatus(
        hasFailedRecipients
          ? CampaignExportStatus.Ready
          : CampaignExportStatus.NoError
      )
    }

    getExportStatus()
    return () => {
      timeoutId && clearTimeout(timeoutId)
    }
  })

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

  function renderExportButtonContent() {
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

  function renderExportButton() {
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
          <ActionButton
            disabled={
              exportStatus === CampaignExportStatus.NoError ||
              exportStatus === CampaignExportStatus.Unavailable
            }
            className={cx({
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
