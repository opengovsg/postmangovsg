import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

import { getPreviewMessage } from 'services/campaign.service'
import { completeFileUpload, getPresignedUrl } from 'services/email.service'
import { uploadFileWithPresignedUrl } from 'services/upload.service'
import { FileInput, InfoBlock, ErrorBlock, PrimaryButton } from 'components/common'

const EmailRecipients = ({ id, csvFilename: initialCsvFilename, numRecipients: initialNumRecipients, onNext }: { id: number; csvFilename: string; numRecipients: number; onNext: (changes: any, next?: boolean) => void }) => {

  const [errorMessage, setErrorMessage] = useState(null)
  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)
  const [previewBody, setPreviewBody] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')


  const { id: campaignId } = useParams()

  async function uploadFile(files: File[]) {
    setIsUploading(true)
    setErrorMessage(null)

    try {
      // user did not select a file
      if (!files[0] || !campaignId) {
        return
      }
      const uploadedFile = files[0]
      // Get presigned url from postman server
      const startUploadResponse = await getPresignedUrl({
        campaignId: +campaignId,
        mimeType: uploadedFile.type,
      })
      // Upload to presigned url
      await uploadFileWithPresignedUrl(uploadedFile, startUploadResponse.presignedUrl)
      const uploadResponse = await completeFileUpload({
        campaignId: +campaignId,
        transactionId: startUploadResponse.transactionId,
        filename: uploadedFile.name,
      })

      // Set state
      setUploadedCsvFilename(uploadedFile.name)
      setNumRecipients(uploadResponse.num_recipients)

      const msgPreview = await getPreviewMessage(id)
      setPreviewBody(msgPreview.body)
      setPreviewSubject(msgPreview.subject || '')

      // Store filename and numRecipients in campaign object
      onNext({ csvFilename: uploadedFile.name, numRecipients: uploadResponse.num_recipients }, false)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  function constructPreviewMessage(body: string, subject: string): string {
    return `
      <div><b>Subject:</b><p>${subject}</p></div>
      <div><b>Body:</b><p>${body}</p></div>
    `
  }

  return (
    <>
      <sub>Step 2</sub>
      <h2>Upload recipient list in CSV format</h2>
      <p>Only CSV format files are allowed. If you have an Excel file, please convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include a <b>recipient</b> column with recipients&apos; email addresses
      </p>
      {numRecipients > 0 &&
        <InfoBlock>
          <li>
            <i className="bx bx-user-check"></i><p>{numRecipients} recipients</p>
          </li>
          {csvFilename &&
            <li><i className='bx bx-file'></i><p>{csvFilename}</p></li>
          }
        </InfoBlock>
      }
      <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>
      {
        previewBody &&
        <>
          <p>Message preview</p>
          <InfoBlock dangerouslySetInnerHTML={{ __html: constructPreviewMessage(previewBody, previewSubject) }}>
          </InfoBlock>
          <div className="separator"></div>
        </>
      }
      <div className="progress-button">
        <PrimaryButton disabled={!numRecipients || !csvFilename} onClick={onNext}>Preview →</PrimaryButton>
      </div>
    </>
  )
}

export default EmailRecipients
