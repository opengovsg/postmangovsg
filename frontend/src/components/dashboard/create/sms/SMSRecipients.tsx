import React, {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  useContext,
} from 'react'
import { useParams } from 'react-router-dom'

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
  ButtonGroup,
  TextButton,
} from 'components/common'
import { SMSCampaign, SMSPreview, SMSProgress } from 'classes'
import { sendTiming } from 'services/ga.service'
import { CampaignContext } from 'contexts/campaign.context'

import styles from '../Create.module.scss'

const SMSRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<SMSProgress>>
}) => {
  const { campaign, setCampaign } = useContext(CampaignContext)
  const {
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
    params,
  } = campaign as SMSCampaign
  const [errorMessage, setErrorMessage] = useState(null)
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [preview, setPreview] = useState({} as SMSPreview)
  const { id: campaignId } = useParams()

  const { csvFilename, numRecipients = 0 } = csvInfo

  // Poll csv status
  useEffect(() => {
    if (!campaignId) return

    let timeoutId: NodeJS.Timeout
    const pollStatus = async () => {
      try {
        const { isCsvProcessing, preview, ...newCsvInfo } = await getCsvStatus(
          +campaignId
        )
        setIsCsvProcessing(isCsvProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as SMSPreview)
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
  }, [campaignId, isCsvProcessing])

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    setCampaign(
      (campaign) =>
        ({
          ...campaign,
          isCsvProcessing,
          csvFilename,
          numRecipients,
        } as SMSCampaign)
    )
  }, [isCsvProcessing, csvFilename, numRecipients, setCampaign])

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
      const tempCsvFilename = await uploadFileToS3(+campaignId, files[0])

      const uploadTimeEnd = performance.now()
      sendTiming('Contacts file', 'upload', uploadTimeEnd - uploadTimeStart)

      setIsCsvProcessing(true)
      setCsvInfo((info) => ({ ...info, tempCsvFilename }))
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
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
      <sub>Step 2</sub>
      <h2>Upload recipient list in CSV format</h2>
      <p>
        Only CSV format files are allowed. If you have an Excel file, please
        convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include a <b>recipient</b> column with recipients&apos;
        mobile numbers
      </p>

      <CsvUpload
        isCsvProcessing={isCsvProcessing}
        csvInfo={csvInfo}
        onErrorClose={clearCsvStatus}
      >
        <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
        <p>or</p>
        <SampleCsv
          params={params}
          defaultRecipient="81234567"
          setErrorMsg={setErrorMessage}
        />
      </CsvUpload>

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>

      {!isCsvProcessing && numRecipients > 0 && (
        <>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock body={preview.body}></PreviewBlock>
          <div className="separator"></div>
        </>
      )}

      <ButtonGroup>
        <NextButton
          disabled={!numRecipients || !csvFilename}
          onClick={() => setActiveStep((s) => s + 1)}
        />
        <TextButton onClick={() => setActiveStep((s) => s - 1)}>
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default SMSRecipients
