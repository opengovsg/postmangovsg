import React, { useState } from 'react'

import { TextInputWithButton, DetailBlock, ErrorBlock } from 'components/common'

const UrlUpload = ({
  isProcessing,
  onSubmit,
  csvInfo,
  onErrorClose,
}: {
  isProcessing: boolean
  onSubmit: (url: string) => any
  csvInfo: {
    numRecipients?: number
    csvFilename?: string
    tempCsvFilename?: string
    csvError?: string
  }
  onErrorClose: Function
}) => {
  const { numRecipients = 0, csvFilename, csvError } = csvInfo
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
  }

  function renderDetails() {
    if (isProcessing) {
      return (
        <DetailBlock>
          <li>
            <i className="bx bx-loader-alt bx-spin"></i>
            <p>
              <b>{csvFilename || 'Your file'}</b> is being processed. You may
              leave this page and check back later.
            </p>
          </li>
        </DetailBlock>
      )
    }

    return (
      <>
        {numRecipients > 0 && (
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
      <TextInputWithButton
        type="email"
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
        loadingButtonLabel="Sending..."
        placeholder="Paste Vault link here"
      />
      <ErrorBlock onClose={onErrorClose} title={csvFilename}>
        {csvError && <span>{csvError}</span>}
      </ErrorBlock>
    </>
  )
}

export default UrlUpload
