import { i18n } from '@lingui/core'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useContext, useEffect, useState } from 'react'

import { OutboundLink } from 'react-ga'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import type { SMSCampaign, SMSPreview, SMSProgress } from 'classes'
import { AgencyList } from 'classes'
import {
  ButtonGroup,
  CsvUpload,
  ErrorBlock,
  FileInput,
  InfoBlock,
  NextButton,
  PreviewBlock,
  SampleCsv,
  StepHeader,
  StepSection,
  TextButton,
  WarningBlock,
} from 'components/common'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { PhonebookListSection } from 'components/phonebook-list'
import { LINKS, PHONEBOOK_FEATURE_ENABLE } from 'config'
import { CampaignContext } from 'contexts/campaign.context'
import { sendTiming } from 'services/ga.service'
import {
  getPhonebookListsByChannel,
  selectPhonebookList,
} from 'services/phonebook.service'
import type { CsvStatusResponse } from 'services/upload.service'
import {
  deleteCsvStatus,
  getCsvStatus,
  uploadFileToS3,
} from 'services/upload.service'

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
  const [phonebookLists, setPhonebookLists] = useState<
    { label: string; value: string }[]
  >([])
  const [selectedPhonebookListId, setSelectedPhonebookListId] =
    useState<number>()
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

  // Select managed list
  useEffect(() => {
    const setSelectedList = async () => {
      try {
        if (selectedPhonebookListId) {
          await selectPhonebookList({
            campaignId: +(campaignId as string),
            listId: selectedPhonebookListId,
          })
          setIsCsvProcessing(true)
        }
      } catch (e) {
        setErrorMessage((e as Error).message)
      }
    }

    void setSelectedList()
  }, [campaignId, selectedPhonebookListId])

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
    updateCampaign({
      isCsvProcessing,
      csvFilename,
      numRecipients,
    })
  }, [isCsvProcessing, csvFilename, numRecipients, updateCampaign])

  const retrieveAndPopulatePhonebookLists = useCallback(async () => {
    const lists = await getPhonebookListsByChannel({ channel: campaign.type })
    if (lists) {
      setPhonebookLists(
        lists.map((l: AgencyList) => {
          return { label: l.name, value: l.id.toString() }
        })
      )
    }
  }, [campaign.type])
  // On load, retrieve the list of phonebook lists
  useEffect(() => {
    void retrieveAndPopulatePhonebookLists()
  }, [campaignId])

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
      <StepHeader
        title="Select existing or upload new recipient list"
        subtitle="Step 2"
      ></StepHeader>
      {PHONEBOOK_FEATURE_ENABLE === 'true' && (
        <PhonebookListSection
          phonebookLists={phonebookLists}
          setSelectedPhonebookListId={setSelectedPhonebookListId}
          retrieveAndPopulatePhonebookLists={retrieveAndPopulatePhonebookLists}
          isProcessing={isCsvProcessing}
          defaultLabel={
            phonebookLists.filter(
              (l) => l.label === csvInfo.csvFilename?.slice(0, -4)
            )[0]?.label
          }
        />
      )}
      <StepSection>
        <StepHeader title="Upload recipient list in CSV format">
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
            This is because some use cases intend to send multiple messages to
            the same recipient. If this is not intended, please remove the
            duplicates. Learn how{' '}
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
