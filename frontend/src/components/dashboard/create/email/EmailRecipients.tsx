import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import {
  completeFileUpload,
  getPresignedUrl,
  getCsvStatus,
} from 'services/email.service'
import {
  uploadFileWithPresignedUrl,
  deleteCsvStatus,
} from 'services/upload.service'
import {
  FileInput,
  InfoBlock,
  ErrorBlock,
  PreviewBlock,
  PrimaryButton,
  SampleCsv,
} from 'components/common'

import styles from '../Create.module.scss'
import { EmailCampaign } from 'classes'

type NullableString = string | null | undefined

const EmailRecipients = ({
  csvFilename: initialCsvFilename,
  numRecipients: initialNumRecipients,
  params,
  isProcessing: initialIsProcessing,
  onNext,
}: {
  csvFilename: string
  numRecipients: number
  params: Array<string>
  isProcessing: boolean
  onNext: (changes: Partial<EmailCampaign>, next?: boolean) => void
}) => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [numRecipients, setNumRecipients] = useState(initialNumRecipients)
  const [isUploading, setIsUploading] = useState(false)
  const [csvFilename, setUploadedCsvFilename] = useState(initialCsvFilename)
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [tempCsvFilename, setTempCsvFilename] = useState<NullableString>(null)
  const [csvError, setCsvError] = useState<NullableString>('')
  const [preview, setPreview] = useState(
    {} as { body: string; subject: string; replyTo: string | null }
  )

  const { id: campaignId } = useParams()

  // Handle file upload
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
      await uploadFileWithPresignedUrl(
        uploadedFile,
        startUploadResponse.presignedUrl
      )
      await completeFileUpload({
        campaignId: +campaignId,
        transactionId: startUploadResponse.transactionId,
        filename: uploadedFile.name,
      })
      setIsCsvProcessing(true)
      setTempCsvFilename(uploadedFile.name)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  function clearCsvStatus() {
    if (campaignId) {
      deleteCsvStatus(+campaignId)
      setCsvError(null)
    }
  }

  // Poll csv status
  useEffect(() => {
    if (!campaignId) return

    let timeoutId: NodeJS.Timeout
    const pollStatus = async () => {
      try {
        const {
          isCsvProcessing,
          csvFilename,
          tempCsvFilename,
          csvError,
          numRecipients,
          preview,
        } = await getCsvStatus(+campaignId)
        setIsCsvProcessing(isCsvProcessing)
        setTempCsvFilename(tempCsvFilename)
        setCsvError(csvError)
        csvFilename && setUploadedCsvFilename(csvFilename)
        numRecipients && setNumRecipients(numRecipients)
        preview && setPreview(preview)
        if (isCsvProcessing) {
          timeoutId = setTimeout(pollStatus, 2000)
        }
      } catch (e) {
        setErrorMessage(e.message)
      }
    }
    pollStatus()

    return () => clearTimeout(timeoutId)
  }, [campaignId, isCsvProcessing])

  useEffect(() => {
    onNext({ isCsvProcessing, csvFilename, numRecipients }, false)
  }, [csvFilename, isCsvProcessing, numRecipients, onNext])

  function renderInfoBlock() {
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
          <div className={styles.uploadActions}>
            <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
            <p>or</p>
            <SampleCsv params={params} defaultRecipient="user@email.com" />
          </div>
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

  function renderErrorBlock() {
    if (isCsvProcessing) {
      return <ErrorBlock>{errorMessage}</ErrorBlock>
    } else {
      return <ErrorBlock onClose={clearCsvStatus}>{csvError}</ErrorBlock>
    }
  }

  function renderPreview() {
    if (!isCsvProcessing && numRecipients > 0) {
      if (preview.body) {
        return (
          <>
            <p className={styles.greyText}>Message preview</p>
            <PreviewBlock
              body={preview.body}
              subject={preview.subject}
              replyTo={preview.replyTo}
            />
            <div className="separator"></div>
          </>
        )
      } else {
        return (
          <InfoBlock>
            <li>
              <i className="bx bx-loader-alt bx-spin"></i>
              <p>Loading preview...</p>
            </li>
          </InfoBlock>
        )
      }
    }
  }

  return (
    <>
      <sub>Step 2</sub>
      <h2>Upload recipient list in CSV format</h2>
      <p>
        Only CSV format files are allowed. If you have an Excel file, please
        convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include a <b>recipient</b> column with recipients&apos;
        email addresses
      </p>

      {renderInfoBlock()}

      {renderErrorBlock()}

      <div className="separator"></div>

      {renderPreview()}

      <div className="progress-button">
        <PrimaryButton
          disabled={!numRecipients || isCsvProcessing}
          onClick={onNext}
        >
          Preview →
        </PrimaryButton>
      </div>
    </>
  )
}

export default EmailRecipients
