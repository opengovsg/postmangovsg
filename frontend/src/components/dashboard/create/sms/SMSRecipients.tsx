import cx from 'classnames'
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
  UrlUpload,
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
  PrimaryButton,
} from 'components/common'
import { VAULT_BUCKET_NAME, LINKS } from 'config'
import { i18n } from '@lingui/core'
import {
  RecipientListType,
  SMSCampaign,
  SMSPreview,
  SMSProgress,
} from 'classes'
import { CampaignContext } from 'contexts/campaign.context'
import useUploadRecipients from 'components/custom-hooks/use-upload-recipients'

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
    uploadRecipients,
    clearCsvStatus,
  } = useUploadRecipients<SMSPreview>()
  const { bucket, csvFilename, numRecipients = 0 } = csvInfo

  const currentRecipientListType =
    bucket === VAULT_BUCKET_NAME
      ? RecipientListType.Vault
      : RecipientListType.Csv
  const [recipientListType, setRecipientListType] = useState(
    currentRecipientListType
  )

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    updateCampaign({
      isCsvProcessing: isProcessing,
      csvFilename,
      numRecipients,
    })
  }, [isProcessing, csvFilename, numRecipients, updateCampaign])

  function handleFileSelected(files: File[]) {
    if (files[0]) uploadRecipients(files[0])
  }

  function renderUploadInput() {
    switch (recipientListType) {
      case RecipientListType.Vault:
        return (
          <>
            <StepHeader title={<h4>Insert Vault link</h4>}>
              <p>
                To use a dataset from{' '}
                <OutboundLink
                  eventLabel={i18n._(LINKS.vaultUrl)}
                  to={i18n._(LINKS.vaultUrl)}
                  target="_blank"
                >
                  Vault
                </OutboundLink>
                , copy and paste the link. Dataset will not be used until you
                click “Use dataset”.
              </p>
            </StepHeader>

            <UrlUpload
              isProcessing={isProcessing}
              csvInfo={
                currentRecipientListType === recipientListType ? csvInfo : {}
              }
              onSubmit={(url) => uploadRecipients(url)}
              onErrorClose={clearCsvStatus}
            />
          </>
        )
      case RecipientListType.Csv:
        return (
          <>
            <StepHeader
              title={
                isDemo ? (
                  'Upload recipient list in CSV format'
                ) : (
                  <h4>Upload CSV file</h4>
                )
              }
              subtitle={isDemo ? 'Step 2' : ''}
            >
              <p>
                Only CSV format files are allowed. If you have an Excel file,
                please convert it by going to File &gt; Save As &gt; CSV (Comma
                delimited).
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
              <FileInput
                isProcessing={isUploading}
                onFileSelected={handleFileSelected}
              />
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
                  You can only send out to 20 recipients per demo campaign. Only
                  the first 20 rows in your CSV file will be taken.
                </span>
              </InfoBlock>
            )}
          </>
        )
    }
  }

  return (
    <>
      {!isDemo && (
        <StepSection>
          <StepHeader title="Add recipient list" subtitle="Step 2">
            <p>
              You may add your recipient list either by uploading a CSV file or
              inserting a Vault link. Only one option is allowed.
            </p>
          </StepHeader>

          <div className={styles.recipientTypeSelector}>
            <PrimaryButton
              onClick={() => setRecipientListType(RecipientListType.Csv)}
              className={cx({
                [styles.active]: recipientListType === RecipientListType.Csv,
              })}
            >
              Use CSV<i className={cx('bx', 'bx-spreadsheet')}></i>
            </PrimaryButton>
            <PrimaryButton
              onClick={() => setRecipientListType(RecipientListType.Vault)}
              className={cx({
                [styles.active]: recipientListType === RecipientListType.Vault,
              })}
            >
              Use Vault link<i className={cx('bx', 'bx-link')}></i>
            </PrimaryButton>
          </div>
        </StepSection>
      )}

      <StepSection>
        {renderUploadInput()}
        <ErrorBlock>{error || sampleCsvError}</ErrorBlock>
      </StepSection>

      {!isProcessing &&
        numRecipients > 0 &&
        currentRecipientListType === recipientListType && (
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
