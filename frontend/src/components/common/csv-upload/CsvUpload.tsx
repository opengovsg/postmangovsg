import React from 'react'

import { InfoBlock, ErrorBlock } from 'components/common'

import styles from './CsvUpload.module.scss'

type NullableString = string | null | undefined

const CsvUpload = ({
  isCsvProcessing,
  csvInfo,
  onErrorClose,
  children,
}: {
  isCsvProcessing: boolean
  csvInfo: {
    numRecipients?: number
    csvFilename?: string
    tempCsvFilename?: string
    csvError?: string
  }
  onErrorClose: Function
  children: React.ReactNode
}) => {
  const { numRecipients = 0, csvFilename, tempCsvFilename, csvError } = csvInfo

  function renderFileUploadInput() {
    if (!isCsvProcessing) {
      return (
        <>
          {numRecipients > 0 && (
            <InfoBlock>
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
            </InfoBlock>
          )}
          <div className={styles.uploadActions}>{children}</div>
        </>
      )
    }
    if (isCsvProcessing) {
      return (
        <InfoBlock>
          <li>
            <i className="bx bx-loader-alt bx-spin"></i>
            <p>
              <b>{tempCsvFilename || 'Your file'}</b> is being processed. You
              may leave this page and check back later.
            </p>
          </li>
        </InfoBlock>
      )
    }
  }

  return (
    <>
      {renderFileUploadInput()}
      <ErrorBlock onClose={onErrorClose}>
        {csvError && (
          <>
            <b>{tempCsvFilename}</b>
            <br />
            {csvError}
          </>
        )}
      </ErrorBlock>
    </>
  )
}

export default CsvUpload
