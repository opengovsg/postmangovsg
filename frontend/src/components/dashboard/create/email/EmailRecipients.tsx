import React, { useState } from 'react'

import { getPreviewMessage } from 'services/email.service'
import { FileInput, InfoBlock, PrimaryButton } from 'components/common'

const EmailRecipients = ({ id, csvFilename: initialCsvFilename, numRecipients: initialNumRecipients, onNext }: { id: number; csvFilename: string; numRecipients: number; onNext: (changes: any, next?: boolean) => void }) => {

  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)
  const [messagePreview, setMessagePreview] = useState('')

  function uploadFile(files: File[]) {
    const uploadedFile = files[0].name
    setIsUploading(true)
    setTimeout(async () => {
      setNumRecipients(100)
      setUploadedCsvFilename(uploadedFile)
      setIsUploading(false)

      const msgPreview = await getPreviewMessage(id)
      setMessagePreview(msgPreview)
    }, 1000)
  }

  return (
    <>
      <sub>Step 2</sub>
      <h2>Upload recipient list in CSV format</h2>
      <p>Only CSV format files are allowed. If you have an Excel file, please convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include a <b>recipient</b> column with recipients&apos; mobile numbers
      </p>
      {!isUploading && numRecipients &&
        <InfoBlock>
          <li>
            <i className="bx bx-user-check"></i><span>{numRecipients} recipients</span>
          </li>
          <li>
            <i className="bx bx-file"></i><span>{csvFilename}</span>
          </li>
        </InfoBlock>
      }
      <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
      <div className="separator"></div>
      {
        csvFilename &&
        <>
          <p>Message preview</p>
          <InfoBlock>{messagePreview}</InfoBlock>
          <div className="separator"></div>
        </>
      }
      <div className="progress-button">
        <PrimaryButton disabled={!numRecipients || !csvFilename} onClick={() => onNext({ csvFilename, numRecipients })}>Preview →</PrimaryButton>
      </div>
    </>
  )
}

export default EmailRecipients
