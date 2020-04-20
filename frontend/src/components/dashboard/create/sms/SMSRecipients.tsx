import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

import { FileInput, InfoBlock, PrimaryButton } from 'components/common'

import { getPresignedUrl, completeFileUpload } from 'services/sms.service'
import axios, { AxiosResponse } from 'axios'

const SMSRecipients = ({ csvFilename: initialCsvFilename, numRecipients: initialNumRecipients, onNext }: { csvFilename: string; numRecipients: number; onNext: (changes: any, next?: boolean) => void }) => {

  const [errorMessage, setErrorMessage] = useState('')
  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)

  const params: { id?: string } = useParams()

  async function uploadFile(files: File[]) {
    setIsUploading(true)

    try {
      // user did not select a file
      if (!files[0]) {
        return
      }

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
        CSV file must include a <b>recipient</b> column with recipients&apos; mobile numbers
      </p>
      {!isUploading && numRecipients &&
        <InfoBlock>
          <li>
            <i className="bx bx-user-check"></i><span>{numRecipients} recipients</span>
          </li>
          {csvFilename ? (
            <li>
              <i className='bx bx-file'></i>
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

      <div className="progress-button">
        <PrimaryButton disabled={!numRecipients || !csvFilename} onClick={() => onNext({ csvFilename, numRecipients })}>Insert Credentials →</PrimaryButton>
      </div>
    </>
  )
}

export default SMSRecipients
