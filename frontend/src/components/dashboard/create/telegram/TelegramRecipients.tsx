import cx from 'classnames'
import React, { useState, useEffect, useContext } from 'react'
import { OutboundLink } from 'react-ga'

import { CampaignContext } from 'contexts/campaign.context'
import {
  FileInput,
  CsvUpload,
  UrlUpload,
  ErrorBlock,
  PreviewBlock,
  NextButton,
  TextButton,
  SampleCsv,
  ButtonGroup,
  StepHeader,
  StepSection,
  InfoBlock,
  WarningBlock,
  PrimaryButton,
} from 'components/common'
import { LINKS } from 'config'
import { i18n } from '@lingui/core'
import { RecipientListType } from 'classes'
import useUploadRecipients from 'components/custom-hooks/use-upload-recipients'
import { getUserSettings } from 'services/settings.service'

import type { Dispatch, SetStateAction } from 'react'
import type { TelegramPreview, TelegramProgress } from 'classes'

import styles from '../Create.module.scss'

const TelegramRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<TelegramProgress>>
}) => {
  const { campaign, updateCampaign } = useContext(CampaignContext)
  const { demoMessageLimit, params } = campaign
  const isDemo = !!demoMessageLimit
  const [sampleCsvError, setSampleCsvError] = useState<string | null>(null)

  const {
    isProcessing,
    isUploading,
    error,
    setError,
    preview,
    csvInfo,
    uploadRecipients,
    clearCsvStatus,
  } = useUploadRecipients<TelegramPreview>()
  const {
    recipientListType: currentRecipientListType,
    csvFilename,
    tempCsvFilename,
    numRecipients = 0,
    csvError,
    tempRecipientListType,
  } = csvInfo
  const [isTesseractUser, setTesseractUser] = useState(false)
  const [recipientListType, setRecipientListType] = useState(
    currentRecipientListType
  )

  useEffect(() => {
    async function getUserFeatureSettings() {
      const { tesseract } = await getUserSettings()
      setTesseractUser(tesseract)
    }
    getUserFeatureSettings()
  }, [setTesseractUser])

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    updateCampaign({
      isCsvProcessing: isProcessing,
      csvFilename,
      numRecipients,
    })
  }, [isProcessing, csvFilename, numRecipients, updateCampaign])

  async function handleFileSelected(files: FileList) {
    if (files[0]) await uploadRecipients(files[0])
  }

  function selectRecipientListType(listType: RecipientListType) {
    setRecipientListType(listType)
    setError(null)
  }

  function isNextDisabled() {
    // Disable next if the current recipient list type is not the same as the selected one
    return (
      currentRecipientListType !== recipientListType ||
      !numRecipients ||
      isProcessing
    )
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
              csvInfo={csvInfo}
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
                isDemo || !isTesseractUser ? (
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

            {(currentRecipientListType !== RecipientListType.Csv ||
              !csvFilename) && (
              <WarningBlock>
                We do not remove duplicate recipients.{' '}
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
      {!isDemo && isTesseractUser && (
        <StepSection>
          <StepHeader title="Add recipient list" subtitle="Step 2">
            <p>
              You may add your recipient list either by uploading a CSV file or
              inserting a Vault link. Only one option is allowed.
            </p>
          </StepHeader>

          <div className={styles.recipientTypeSelector}>
            <PrimaryButton
              onClick={() => selectRecipientListType(RecipientListType.Csv)}
              className={cx({
                [styles.active]: recipientListType === RecipientListType.Csv,
              })}
            >
              Use CSV<i className={cx('bx', 'bx-spreadsheet')}></i>
            </PrimaryButton>
            <PrimaryButton
              onClick={() => selectRecipientListType(RecipientListType.Vault)}
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
        {tempRecipientListType === recipientListType && (
          <ErrorBlock title={tempCsvFilename} onClose={clearCsvStatus}>
            {csvError}
          </ErrorBlock>
        )}
        <ErrorBlock>{error || sampleCsvError}</ErrorBlock>
      </StepSection>

      {!isProcessing && numRecipients > 0 && (isDemo || !isTesseractUser) && (
        <>
          <StepSection>
            <p className={styles.greyText}>Message preview</p>
            <PreviewBlock
              body={preview.body?.replace(/\n/g, '<br />')}
            ></PreviewBlock>
          </StepSection>
        </>
      )}

      <ButtonGroup>
        <NextButton
          disabled={isNextDisabled()}
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

export default TelegramRecipients
