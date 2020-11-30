import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { useParams } from 'react-router-dom'
import { OutboundLink } from 'react-ga'

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
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
  WarningBlock,
} from 'components/common'
import { LINKS } from 'config'
import { i18n } from 'locales'
import { EmailPreview, EmailProgress } from 'classes'
import { sendTiming } from 'services/ga.service'

import styles from '../Create.module.scss'

const EmailRecipients = ({
  setActiveStep,
  onFileSelected,
  template,
  forceReset,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
  onFileSelected?: (campaignId: number, file: File) => Promise<any>
  template?: string
  forceReset?: boolean // this forces upload button to show without csv info and preview
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const {
    csvFilename: initialCsvFilename,
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    params,
    protect,
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
    updateCampaign({ isCsvProcessing, csvFilename, numRecipients })
  }, [isCsvProcessing, csvFilename, numRecipients, updateCampaign])

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
      <StepSection>
        <StepHeader
          title="Upload recipient list in CSV format"
          subtitle={protect ? '' : 'Step 2'}
        >
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
                  a <b>password</b> column with the password to access the
                  protected message
                </li>
                <li>all other keywords in the template</li>
              </>
            )}
          </p>
        </StepHeader>

        {!csvFilename && (
          <WarningBlock title={'We do not remove duplicate recipients'}>
            <OutboundLink
              className={styles.warningHelpLink}
              eventLabel={i18n._(LINKS.guideRemoveDuplicatesUrl)}
              to={i18n._(LINKS.guideRemoveDuplicatesUrl)}
              target="_blank"
            >
              Learn how to remove duplicates in your excel from our guide.
            </OutboundLink>
          </WarningBlock>
        )}

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
      </StepSection>

      {!isCsvProcessing && numRecipients > 0 && (
        <StepSection>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock
            body={preview?.body}
            subject={preview?.subject}
            replyTo={preview?.replyTo}
            from={preview?.from}
          />
        </StepSection>
      )}
      {!protect && (
        <ButtonGroup>
          <NextButton
            disabled={!numRecipients || isCsvProcessing}
            onClick={() => setActiveStep((s) => s + 1)}
          />
          <TextButton onClick={() => setActiveStep((s) => s - 1)}>
            Previous
          </TextButton>
        </ButtonGroup>
      )}
    </>
  )
}

export default EmailRecipients
