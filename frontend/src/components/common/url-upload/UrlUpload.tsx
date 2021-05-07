import React, { useState } from 'react'

import { CsvStatusResponse } from 'services/upload.service'
import { TextInputWithButton, DetailBlock } from 'components/common'
import { RecipientListType } from 'classes'

const UrlUpload = ({
  isProcessing,
  onSubmit,
  csvInfo,
}: {
  isProcessing: boolean
  onSubmit: (url: string) => any
  csvInfo: Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  onErrorClose: () => void
}) => {
  const {
    numRecipients = 0,
    csvFilename,
    tempCsvFilename,
    recipientListType,
  } = csvInfo
  const [url, setUrl] = useState('')

  function isValidUrl() {
    if (!url) return false

    let parsedUrl
    try {
      parsedUrl = new URL(url)
    } catch (err) {
      return false
    }

    const { protocol } = parsedUrl
    return ['http:', 'https:'].includes(protocol)
  }

  async function onClickHandler() {
    await onSubmit(url)
    setUrl('')
  }

  function renderDetails() {
    if (isProcessing) {
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

    return (
      <>
        {numRecipients > 0 && recipientListType === RecipientListType.Vault && (
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
      </>
    )
  }

  return (
    <>
      {renderDetails()}
      {!isProcessing && (
        <TextInputWithButton
          type="url"
          value={url}
          onChange={setUrl}
          onClick={onClickHandler}
          buttonDisabled={!isValidUrl()}
          buttonLabel={
            <>
              Use dataset
              <i className="bx bx-right-arrow-alt"></i>
            </>
          }
          loadingButtonLabel="Uploading..."
          placeholder="Paste Vault link here"
        />
      )}
    </>
  )
}

export default UrlUpload
