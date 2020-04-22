import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

import axios, { AxiosResponse } from 'axios'

import {
  completeFileUpload,
  getPresignedUrl,
  getPreviewMessage,
} from 'services/email.service'
import { FileInput, InfoBlock, PrimaryButton } from 'components/common'

const EmailRecipients = ({ id, csvFilename: initialCsvFilename, numRecipients: initialNumRecipients, onNext }: { id: number; csvFilename: string; numRecipients: number; onNext: (changes: any, next?: boolean) => void }) => {

  const [errorMessage, setErrorMessage] = useState('')
  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)
  const [messagePreview, setMessagePreview] = useState('')

  const params: { id?: string } = useParams()

  async function uploadFile(files: File[]) {
    setIsUploading(true)
    try {
      // user did not select a file
      if (!files[0]) {
        return
      }

      // where do i put this
      const msgPreview = await getPreviewMessage(id)
      setMessagePreview(msgPreview)

      const uploadedFile = files[0]
      const campaignId = +params.id!

      const startUploadResponse = await getPresignedUrl({
        campaignId,
        mimeType: uploadedFile.type,
      })
      console.log('obtained s3 presigned url')

      const s3AxiosInstance = axios.create({
        withCredentials: false,
      })
      await s3AxiosInstance.put(startUploadResponse.presignedUrl, uploadedFile, {
        headers: { 'Content-Type': uploadedFile.type },
      })
      console.log('PUT to s3 succeeded')

      // POST to upload complete
      const uploadResponse = await completeFileUpload({
        campaignId,
        transactionId: startUploadResponse.transactionId,
      })

      setUploadedCsvFilename(uploadedFile.name)
      setNumRecipients(uploadResponse.num_recipients)

    } catch (err) {
      const axiosError: AxiosResponse = err.response
      if (axiosError !== undefined) {
        if (axiosError.status === 400) {
          setErrorMessage(axiosError?.data?.message)
        } else {
          setErrorMessage('Error uploading file.')
        }
        console.error(axiosError)
      } else {
        console.error(err)
      }
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
        CSV file must include a <b>recipient</b> column with recipients&apos; email addresses.
        Please ensure that the required field is labelled recipient in your .csv file.
      </p>
      {!isUploading && numRecipients &&
        <InfoBlock>
          <li>
            a<i className="bx bx-user-check"></i><span>{numRecipients} recipients</span>
          </li>
          {csvFilename ? (
            <li>
              b<i className='bx bx-file'></i>
              <span>{csvFilename}</span>
            </li>
          ) : (
            <></>
          )}
        </InfoBlock>
      }
      <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />

      {
        errorMessage.length !== 0 ? <div>Error: {errorMessage}</div> : <></>
      }

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
