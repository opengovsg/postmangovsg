import type { ReactNode } from 'react'

import styles from './CsvUpload.module.scss'

import { DetailBlock, ErrorBlock, StepHeader } from 'components/common'

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
  onErrorClose: () => void
  children: ReactNode
}) => {
  const { numRecipients = 0, csvFilename, tempCsvFilename, csvError } = csvInfo

  function renderFileUploadInput() {
    if (!isCsvProcessing) {
      return (
        <>
          {numRecipients > 0 && (
            <>
              <div className="separator"></div>
              <StepHeader title={'Summary'} />
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
            </>
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

  return (
    <div className={styles.container}>
      {renderFileUploadInput()}
      <ErrorBlock onClose={onErrorClose} title={tempCsvFilename}>
        {csvError && <span>{csvError}</span>}
      </ErrorBlock>
    </div>
  )
}

export default CsvUpload
