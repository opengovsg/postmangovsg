import React, {
  useState,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { OutboundLink } from 'react-ga'

import { CampaignContext } from 'contexts/campaign.context'
import {
  FileInput,
  CsvUpload,
  ErrorBlock,
  EmailPreviewBlock,
  NextButton,
  SampleCsv,
  ButtonGroup,
  TextButton,
  StepHeader,
  StepSection,
  WarningBlock,
} from 'components/common'
import { LINKS } from 'config'
import { i18n } from '@lingui/core'
import { EmailPreview, EmailProgress } from 'classes'
import useUploadCsv from 'components/custom-hooks/use-upload-csv'

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
  const { params, protect } = campaign
  const [sampleCsvError, setSampleCsvError] = useState(null)

  const {
    isProcessing,
    isUploading,
    error,
    preview,
    csvInfo,
    uploadFile,
    clearCsvStatus,
  } = useUploadCsv<EmailPreview>(onFileSelected, forceReset)
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
          isCsvProcessing={isProcessing}
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
                setErrorMsg={setSampleCsvError}
              />
            </>
          )}
        </CsvUpload>
        <ErrorBlock>{error || sampleCsvError}</ErrorBlock>
      </StepSection>

      {!isProcessing && numRecipients > 0 && (
        <StepSection>
          <p className={styles.greyText}>Message preview</p>
          <EmailPreviewBlock
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
            disabled={!numRecipients || isProcessing}
            onClick={() => setActiveStep((s) => s + 1)}
          />
          <TextButton
            disabled={isProcessing}
            onClick={() => setActiveStep((s) => s - 1)}
          >
            Previous
          </TextButton>
        </ButtonGroup>
      )}
    </>
  )
}

export default EmailRecipients
