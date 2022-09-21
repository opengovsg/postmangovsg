import { i18n } from '@lingui/core'

import { useState, useEffect, useContext } from 'react'

import type { Dispatch, SetStateAction } from 'react'

import { OutboundLink } from 'react-ga'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import type { SMSCampaign, SMSPreview, SMSProgress, List } from 'classes'
import {
  FileInput,
  CsvUpload,
  ErrorBlock,
  PreviewBlock,
  NextButton,
  SampleCsv,
  ButtonGroup,
  TextButton,
  StepSection,
  StepHeader,
  InfoBlock,
  WarningBlock,
} from 'components/common'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { ManagedListSection } from 'components/experimental'
import { LINKS } from 'config'
import { CampaignContext } from 'contexts/campaign.context'

import { sendTiming } from 'services/ga.service'
import { selectList, getLists } from 'services/list.service'
import {
  uploadFileToS3,
  deleteCsvStatus,
  getCsvStatus,
} from 'services/upload.service'

import type { CsvStatusResponse } from 'services/upload.service'

const SMSRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<SMSProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const {
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
    demoMessageLimit,
    params,
  } = campaign as SMSCampaign
  const isDemo = !!demoMessageLimit

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [managedLists, setManagedLists] = useState<List[]>([])
  const [selectedListId, setSelectedListId] = useState<number>()
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [preview, setPreview] = useState({} as SMSPreview)
  const { id: campaignId } = useParams<{ id: string }>()

  const { csvFilename, numRecipients = 0 } = csvInfo
  const isMounted = useIsMounted()

  // Retrieve managed lists - just once on component load
  useEffect(() => {
    const getManagedLists = async () => {
      try {
        const managedLists = await getLists()
        setManagedLists(managedLists)
      } catch (e) {
        setErrorMessage((e as Error).message)
      }
    }

    void getManagedLists()
  }, [])

  // Select managed list
  useEffect(() => {
    const setSelectedList = async () => {
      try {
        if (selectedListId) {
          await selectList({ campaignId: +campaignId, listId: selectedListId })
          setIsCsvProcessing(true)
        }
      } catch (e) {
        setErrorMessage((e as Error).message)
      }
    }

    void setSelectedList()
  }, [campaignId, selectedListId])

  // Poll csv status
  useEffect(() => {
    if (!campaignId) return

    let timeoutId: NodeJS.Timeout
    const pollStatus = async () => {
      try {
        const { isCsvProcessing, preview, ...newCsvInfo } = await getCsvStatus(
          +campaignId
        )
        // Prevent setting state if unmounted
        if (!isMounted.current) return

        setIsCsvProcessing(isCsvProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as SMSPreview)
        }
        if (isCsvProcessing) {
          timeoutId = setTimeout(pollStatus, 2000)
        }
      } catch (e) {
        setErrorMessage((e as Error).message)
      }
    }

    // Retrieve status regardless of isCsvProcessing to retrieve csvError if any
    // If completed, it will only poll once
    void pollStatus()

    return () => clearTimeout(timeoutId)
  }, [campaignId, isCsvProcessing, isMounted])

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    updateCampaign({ isCsvProcessing, csvFilename, numRecipients })
  }, [isCsvProcessing, csvFilename, numRecipients, updateCampaign])

  // Handle file upload
  async function uploadFile(files: FileList) {
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

      // Prevent setting state if unmounted
      if (!isMounted.current) {
        return
      }

      setIsCsvProcessing(true)
      setCsvInfo((info) => ({ ...info, tempCsvFilename }))
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
    setIsUploading(false)
  }

  // Hide csv error from previous upload and delete from db
  function clearCsvStatus() {
    if (campaignId) {
      setCsvInfo((info) => ({ ...info, csvError: undefined }))
      void deleteCsvStatus(+campaignId)
    }
  }

  return (
    <>
      <StepSection>
        <StepHeader
          title="Upload recipient list in CSV format"
          subtitle="Step 2"
        >
          <p>
            Only CSV format files are allowed. If you have an Excel file, please
            convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
          </p>
          <p>
            CSV file must include a <b>recipient</b> column with
            recipients&apos; mobile numbers
          </p>
        </StepHeader>

        {!csvFilename && (
          <WarningBlock title={'We do not remove duplicate recipients'}>
            Learn how to remove duplicates in your excel{' '}
            <OutboundLink
              className={styles.warningHelpLink}
              eventLabel={i18n._(LINKS.guideRemoveDuplicatesUrl)}
              to={i18n._(LINKS.guideRemoveDuplicatesUrl)}
              target="_blank"
            >
              from our guide
            </OutboundLink>
            .
          </WarningBlock>
        )}

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
        {isDemo && (
          <InfoBlock title="Limited to 20 recipients">
            <span>
              You can only send out to 20 recipients per demo campaign. Only the
              first 20 rows in your CSV file will be taken.
            </span>
          </InfoBlock>
        )}
        <ManagedListSection
          managedLists={managedLists}
          setSelectedListId={setSelectedListId}
        />
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </StepSection>

      {!isCsvProcessing && numRecipients > 0 && (
        <StepSection>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock body={preview.body}></PreviewBlock>
        </StepSection>
      )}

      <ButtonGroup>
        <NextButton
          disabled={!numRecipients || !csvFilename}
          onClick={() => setActiveStep((s) => s + 1)}
        />
        <TextButton
          disabled={isCsvProcessing}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default SMSRecipients
