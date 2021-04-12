import React from 'react'

import { CsvStatusResponse } from 'services/upload.service'
import { DetailBlock } from 'components/common'
import { RecipientListType } from 'classes'

import styles from './CsvUpload.module.scss'

const CsvUpload = ({
  isCsvProcessing,
  csvInfo,
  children,
}: {
  isCsvProcessing: boolean
  csvInfo: Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  onErrorClose: () => void
  children: React.ReactNode
}) => {
  const {
    numRecipients = 0,
    csvFilename,
    recipientListType,
    tempCsvFilename,
  } = csvInfo

  function renderFileUploadInput() {
    if (!isCsvProcessing) {
      return (
        <>
          {numRecipients > 0 && recipientListType === RecipientListType.Csv && (
            <DetailBlock>
              <li>
                <i className="bx bx-user-check"></i>
                <p>{numRecipients} recipients</p>
              </li>
              {csvFilename && (
                <li>
                  <i className="bx bx-file"></i>
                  <p>{csvFilename}</p>
                </li>
              )}
            </DetailBlock>
          )}
          <div className={styles.uploadActions}>{children}</div>
        </>
      )
    }
    if (isCsvProcessing) {
      return (
        <DetailBlock>
          <li>
            <i className="bx bx-loader-alt bx-spin"></i>
            <p>
              <b>{tempCsvFilename || 'Your file'}</b> is being processed. You
              may leave this page and check back later.
            </p>
          </li>
        </DetailBlock>
      )
    }
  }

  return <div className={styles.container}>{renderFileUploadInput()}</div>
}

export default CsvUpload
