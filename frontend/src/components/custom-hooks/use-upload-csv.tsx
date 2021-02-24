import { useContext, useState, useEffect } from 'react'
import { CampaignContext } from 'contexts/campaign.context'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { sendTiming } from 'services/ga.service'
import {
  uploadFileToS3,
  deleteCsvStatus,
  getCsvStatus,
  CsvStatusResponse,
} from 'services/upload.service'
import { EmailPreview, SMSPreview, TelegramPreview } from 'classes'

function useUploadCsv<
  Preview extends EmailPreview | SMSPreview | TelegramPreview
>(
  onFileSelected?: (campaignId: number, file: File) => Promise<any>,
  forceReset?: boolean
) {
  const { campaign } = useContext(CampaignContext)
  if (!campaign)
    throw new Error('useUploadCsv must be used within a CampaignProvider')

  const {
    id: campaignId,
    csvFilename: initialCsvFilename,
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
  } = campaign

  const isMounted = useIsMounted()

  const [isProcessing, setIsProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [preview, setPreview] = useState({} as Preview)
  const { csvFilename } = csvInfo

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

        setIsProcessing(isCsvProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as Preview)
        }

        if (isCsvProcessing) {
          timeoutId = setTimeout(pollStatus, 2000)
        }
      } catch (e) {
        setError(e.message)
      }
    }

    // Retrieve status regardless of isCsvProcessing to retrieve csvError if any
    // If completed, it will only poll once
    pollStatus()

    return () => clearTimeout(timeoutId)
  }, [campaignId, csvFilename, forceReset, isProcessing, isMounted])

  // Handle file upload
  async function uploadFile(files: File[]) {
    setIsUploading(true)
    setError(null)
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

      setIsProcessing(true)
      setCsvInfo((info) => ({ ...info, tempCsvFilename: files[0].name }))
    } catch (err) {
      setError(err.message)
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

  return {
    isProcessing,
    isUploading,
    error,
    preview,
    csvInfo,
    uploadFile,
    clearCsvStatus,
  }
}

export default useUploadCsv
