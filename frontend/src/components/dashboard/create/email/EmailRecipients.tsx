import React, { useState, useEffect, useRef, useContext } from 'react'
import { useParams } from 'react-router-dom'

import { CampaignContext } from 'contexts/campaign.context'
import {
  uploadFileToS3,
  deleteCsvStatus,
  getCsvStatus,
  CsvStatusResponse,
} from 'services/upload.service'
import {
  FileInput,
  CsvUpload,
  ErrorBlock,
  PreviewBlock,
  NextButton,
  SampleCsv,
} from 'components/common'
import { EmailCampaign, EmailPreview } from 'classes'
import { sendTiming } from 'services/ga.service'

import styles from '../Create.module.scss'

const EmailRecipients = ({
  onFileSelected,
  template,
  forceReset,
}: {
  onFileSelected?: (campaignId: number, file: File) => Promise<any>
  template?: string
  forceReset?: boolean // this forces upload button to show without csv info and preview
}) => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const {
    csvFilename: initialCsvFilename,
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    params,
    protect,
    progress,
  } = campaign
  const [errorMessage, setErrorMessage] = useState(null)
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [preview, setPreview] = useState({} as EmailPreview)
  const { id: campaignId } = useParams()
  const { csvFilename, numRecipients = 0 } = csvInfo
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Poll csv status
  useEffect(() => {
    if (!campaignId) return

    let timeoutId: NodeJS.Timeout
    const pollStatus = async () => {
      try {
        if (forceReset) {
          setCsvInfo({ csvFilename })
          return
        }
        const { isCsvProcessing, preview, ...newCsvInfo } = await getCsvStatus(
          +campaignId
        )
        // Prevent setting state if unmounted
        if (!isMounted.current) return

        setIsCsvProcessing(isCsvProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as EmailPreview)
        }
        if (isCsvProcessing) {
          timeoutId = setTimeout(pollStatus, 2000)
        }
      } catch (e) {
        setErrorMessage(e.message)
      }
    }

    // Retrieve status regardless of isCsvProcessing to retrieve csvError if any
    // If completed, it will only poll once
    pollStatus()

    return () => clearTimeout(timeoutId)
  }, [campaignId, csvFilename, forceReset, isCsvProcessing])

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    setCampaign(
      (campaign) =>
        ({
          ...campaign,
          isCsvProcessing,
          csvFilename,
          numRecipients,
        } as EmailCampaign)
    )
  }, [isCsvProcessing, csvFilename, numRecipients, setCampaign, campaign])

  // Handle file upload
  async function uploadFile(files: File[]) {
    setIsUploading(true)
    setErrorMessage(null)
    const uploadTimeStart = performance.now()

    try {
      // user did not select a file
      if (!files[0] || !campaignId) {
        return
      }
      clearCsvStatus()

      await (onFileSelected || uploadFileToS3)(+campaignId, files[0])

      const uploadTimeEnd = performance.now()
      sendTiming('Contacts file', 'upload', uploadTimeEnd - uploadTimeStart)

      // Prevent setting state if unmounted
      if (!isMounted.current) {
        return
      }

      setIsCsvProcessing(true)
      setCsvInfo((info) => ({ ...info, tempCsvFilename: files[0].name }))
    } catch (err) {
      setErrorMessage(err.message)
    }
    setIsUploading(false)
  }

  // Hide csv error from previous upload and delete from db
  function clearCsvStatus() {
    if (campaignId) {
      setCsvInfo((info) => ({ ...info, csvError: undefined }))
      deleteCsvStatus(+campaignId)
    }
  }

  return (
    <>
      {!protect && <sub>Step 2</sub>}
      <h2>Upload recipient list in CSV format</h2>
      <p>
        Only CSV format files are allowed. If you have an Excel file, please
        convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include:
        <li>
          a <b>recipient</b> column with recipients&apos; email addresses
        </li>
        {protect && (
          <>
            <li>
              a <b>password</b> column with the password to access the protected
              message
            </li>
            <li>all other keywords in the template</li>
          </>
        )}
      </p>

      <CsvUpload
        isCsvProcessing={isCsvProcessing}
        csvInfo={csvInfo}
        onErrorClose={clearCsvStatus}
      >
        {/* Dont show upload button when upload completed for protected component */}
        {(!protect || !numRecipients) && (
          <>
            <FileInput
              isProcessing={isUploading}
              onFileSelected={uploadFile}
              disabled={protect && !template}
            />
            <p>or</p>
            <SampleCsv
              params={protect ? [] : params}
              protect={protect}
              template={template}
              defaultRecipient="user@email.com"
              setErrorMsg={setErrorMessage}
            />
          </>
        )}
      </CsvUpload>

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>

      {!isCsvProcessing && numRecipients > 0 && (
        <>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock
            body={preview?.body}
            subject={preview?.subject}
            replyTo={preview?.replyTo}
            from={preview?.from}
          />
          <div className="separator"></div>
        </>
      )}
      {!protect && (
        <NextButton
          disabled={!numRecipients || isCsvProcessing}
          onClick={() =>
            setCampaign(
              (campaign) =>
                ({
                  ...campaign,
                  progress: progress + 1,
                } as EmailCampaign)
            )
          }
        />
      )}
    </>
  )
}

export default EmailRecipients
