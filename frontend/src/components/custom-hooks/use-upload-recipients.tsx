import { useContext, useState, useEffect } from 'react'
import { CampaignContext } from 'contexts/campaign.context'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { sendTiming } from 'services/ga.service'
import {
  uploadFileToS3,
  uploadVaultLink,
  deleteCsvStatus,
  getCsvStatus,
  CsvStatusResponse,
} from 'services/upload.service'
import { EmailPreview, SMSPreview, TelegramPreview } from 'classes'

type UploadFunction = (campaignId: number, file: any) => Promise<any>

const uploadFileOrVaultLink = (
  campaignId: number,
  recipientList: string | File
): Promise<any> => {
  if (typeof recipientList !== 'string') {
    return uploadFileToS3(campaignId, recipientList)
  }
  return uploadVaultLink(campaignId, recipientList)
}

function useUploadRecipients<
  Preview extends EmailPreview | SMSPreview | TelegramPreview
>(upload: UploadFunction = uploadFileOrVaultLink, forceReset?: boolean) {
  const { campaign } = useContext(CampaignContext)
  if (!campaign)
    throw new Error('useUploadCsv must be used within a CampaignProvider')

  const {
    id: campaignId,
    csvFilename: initialCsvFilename,
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    recipientListType: initialRecipientListType,
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
    recipientListType: initialRecipientListType,
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
        const {
          isCsvProcessing: isProcessing,
          preview,
          ...newCsvInfo
        } = await getCsvStatus(+campaignId)

        // Prevent setting state if unmounted
        if (!isMounted.current) return

        setIsProcessing(isProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as Preview)
        }

        if (isProcessing) {
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
  async function uploadRecipients(recipientList: File | string) {
    setIsUploading(true)
    setError(null)
    const uploadTimeStart = performance.now()

    try {
      if (!campaignId) return
      clearCsvStatus()

      await upload(+campaignId, recipientList)

      const uploadTimeEnd = performance.now()
      sendTiming('Contacts file', 'upload', uploadTimeEnd - uploadTimeStart)

      // Prevent setting state if unmounted
      if (!isMounted.current) {
        return
      }

      setIsProcessing(true)
      if (typeof recipientList !== 'string') {
        setCsvInfo((info) => ({ ...info, tempCsvFilename: recipientList.name }))
      }
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
    setError,
    preview,
    csvInfo,
    uploadRecipients,
    clearCsvStatus,
  }
}

export default useUploadRecipients
