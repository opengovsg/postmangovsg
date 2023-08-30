import { i18n } from '@lingui/core'
import { filter } from 'lodash'
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import { OutboundLink } from 'react-ga'

import { useParams } from 'react-router-dom'

import styles from '../Create.module.scss'

import { confirmSendCampaign } from '../util'

import { ChannelType, GovsgProgress } from 'classes'
import {
  ButtonGroup,
  ConfirmModal,
  CsvUpload,
  ErrorBlock,
  FileInput,
  PreviewBlock,
  PrimaryButton,
  SampleCsv,
  StepHeader,
  StepSection,
  TextButton,
  WarningBlock,
} from 'components/common'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import { LINKS } from 'config'

import { CampaignContext } from 'contexts/campaign.context'
import { ModalContext } from 'contexts/modal.context'
import {
  CsvStatusResponse,
  deleteCsvStatus,
  getCsvStatus,
  uploadFileToS3,
} from 'services/upload.service'

const GovsgRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<GovsgProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const {
    isCsvProcessing: initialIsProcessing,
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
    params,
  } = campaign
  const paramsWithoutPasscode = filter(params, (value) => value !== 'passcode')
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({ numRecipients: initialNumRecipients, csvFilename: initialCsvFilename })
  const { csvFilename, numRecipients = 0 } = csvInfo
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{ body: string }>({ body: '' })
  const isMounted = useIsMounted()
  const { id: campaignId } = useParams<{ id: string }>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const modalContext = useContext(ModalContext)

  // Scroll window to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
          setPreview(preview)
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

  useEffect(() => {
    updateCampaign({
      isCsvProcessing,
      csvFilename,
      numRecipients,
    })
  }, [isCsvProcessing, csvFilename, numRecipients, updateCampaign])

  async function uploadFile(files: FileList) {
    setIsUploading(true)
    setErrorMessage(null)

    try {
      if (!files[0] || !campaignId) {
        return
      }
      clearCsvStatus()
      const tempCsvFilename = await uploadFileToS3(+campaignId, files[0])
      if (!isMounted.current) {
        return
      }

      setIsCsvProcessing(true)
      setCsvInfo({ ...csvInfo, tempCsvFilename })
    } catch (err) {
      setErrorMessage((err as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  function clearCsvStatus() {
    if (campaignId) {
      setCsvInfo({ ...csvInfo, csvError: undefined })
      void deleteCsvStatus(+campaignId)
    }
  }

  const onModalConfirm = () => {
    if (!campaignId) return
    void confirmSendCampaign({
      campaignId: +campaignId,
      channelType: ChannelType.Govsg,
      sendRate: 0,
      updateCampaign,
    })
  }
  const openModal = () => {
    modalContext.setModalContent(
      <ConfirmModal
        title="Are you absolutely sure?"
        subtitle="Sending out a campaign is irreversible."
        buttonText="Confirm send now"
        buttonIcon="bx-send"
        onConfirm={onModalConfirm}
      />
    )
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
            params={
              canAccessGovsgV
                ? ['language', ...paramsWithoutPasscode]
                : paramsWithoutPasscode
            }
            defaultParams={{ language: 'English' }}
            defaultRecipient="81234567"
            setErrorMsg={console.error}
          />
        </CsvUpload>
        <ErrorBlock>{errorMessage}</ErrorBlock>
      </StepSection>

      {!isCsvProcessing && numRecipients > 0 && (
        <StepSection>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock body={preview.body} hideHeaders richPreview />
        </StepSection>
      )}

      <ButtonGroup>
        <PrimaryButton
          disabled={!numRecipients || !csvFilename}
          className={styles.turquoiseGreenBtn}
          onClick={openModal}
        >
          Send campaign now <i className="bx bx-send" />
        </PrimaryButton>
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

export default GovsgRecipients
