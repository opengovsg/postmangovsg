import React, {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  useContext,
} from 'react'
import { OutboundLink } from 'react-ga'

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
import { LINKS } from 'config'
import { i18n } from '@lingui/core'
import { SMSCampaign, SMSPreview, SMSProgress } from 'classes'
import { CampaignContext } from 'contexts/campaign.context'
import useUploadCsv from 'components/custom-hooks/use-upload-csv'

import styles from '../Create.module.scss'

const SMSRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<SMSProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { demoMessageLimit, params } = campaign as SMSCampaign
  const isDemo = !!demoMessageLimit

  const [sampleCsvError, setSampleCsvError] = useState(null)

  const {
    isProcessing,
    isUploading,
    error,
    preview,
    csvInfo,
    uploadFile,
    clearCsvStatus,
  } = useUploadCsv<SMSPreview>()
  const { csvFilename, numRecipients = 0 } = csvInfo

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    updateCampaign({
      isCsvProcessing: isProcessing,
      csvFilename,
      numRecipients,
    })
  }, [isProcessing, csvFilename, numRecipients, updateCampaign])

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
          isCsvProcessing={isProcessing}
          csvInfo={csvInfo}
          onErrorClose={clearCsvStatus}
        >
          <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
          <p>or</p>
          <SampleCsv
            params={params}
            defaultRecipient="81234567"
            setErrorMsg={setSampleCsvError}
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
        <ErrorBlock>{error || sampleCsvError}</ErrorBlock>
      </StepSection>

      {!isProcessing && numRecipients > 0 && (
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
          disabled={isProcessing}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          Previous
        </TextButton>
      </ButtonGroup>
    </>
  )
}

export default SMSRecipients
