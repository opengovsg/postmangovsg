import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { completeFileUpload, getPresignedUrl, getPreviewMessage } from 'services/email.service'
import { uploadFileWithPresignedUrl } from 'services/upload.service'
import { FileInput, InfoBlock, ErrorBlock, PreviewBlock, PrimaryButton, SampleCsv } from 'components/common'

import styles from '../Create.module.scss'

const EmailRecipients = ({ csvFilename: initialCsvFilename, numRecipients: initialNumRecipients, params, onNext }:
  { csvFilename: string; numRecipients: number; params: Array<string>; onNext: (changes: any, next?: boolean) => void }) => {

  const [errorMessage, setErrorMessage] = useState(null)
  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState({} as { body: string; subject: string; reply_to: string | null })

  const { id: campaignId } = useParams()

  useEffect(() => {
    loadPreview()
  }, [campaignId])

  async function loadPreview() {
    if (campaignId) {
      try {
        const msgPreview = await getPreviewMessage(+campaignId)
        if (msgPreview) {
          setPreview(msgPreview)
        }
      } catch (err){
        setErrorMessage(err.message)
      }
    }
  }

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

      await loadPreview()

      // Store filename and numRecipients in campaign object
      onNext({ csvFilename: uploadedFile.name, numRecipients: uploadResponse.num_recipients }, false)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
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

      <div className={styles.uploadActions}>
        <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
        <p>or</p>
        <SampleCsv params={params} defaultRecipient="user@email.com" />
      </div>

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>
      {
        preview?.body &&
        <>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock body={preview.body} subject={preview.subject} replyTo={preview.reply_to} />
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
