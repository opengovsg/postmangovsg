import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

import {
  PrimaryButton,
  NextButton,
  TextButton,
  TextArea,
  InfoBlock,
  ErrorBlock,
  ProtectedPreview,
} from 'components/common'
import EmailRecipients from './EmailRecipients'
import { EmailCampaign } from 'classes'
import { sendTiming } from 'services/ga.service'
import { ProtectedCsvInfo, validateCsv } from 'services/validate-csv.service'
import { protectAndUploadCsv } from 'services/protect-csv.service'

enum ProtectPhase {
  READY,
  VALIDATING,
  PREVIEW,
  UPLOADING,
  PROCESSING,
  DONE,
}

const ProtectedEmailRecipients = ({
  csvFilename,
  numRecipients,
  isProcessing,
  onNext,
}: {
  csvFilename: string
  numRecipients: number
  isProcessing: boolean
  onNext: (changes: Partial<EmailCampaign>, next?: boolean) => void
}) => {
  const [template, setTemplate] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File>()
  const [protectedCsvInfo, setProtectedCsvInfo] = useState<ProtectedCsvInfo>()
  const { id: campaignId } = useParams()

  const [phase, setPhase] = useState<ProtectPhase>(
    computePhase(numRecipients, isProcessing)
  )

  useEffect(() => {
    setPhase(computePhase(numRecipients, isProcessing))
  }, [numRecipients, isProcessing])

  function computePhase(
    numRecipients: number,
    isProcessing: boolean
  ): ProtectPhase {
    let computedPhase = ProtectPhase.READY
    if (numRecipients) {
      computedPhase = ProtectPhase.DONE
    }
    if (isProcessing) {
      computedPhase = ProtectPhase.PROCESSING
    }
    return computedPhase
  }

  async function onFileSelected(campaignId: number, file: File) {
    setErrorMessage('')
    setPhase(ProtectPhase.VALIDATING)
    setSelectedFile(file)
    try {
      const validationInfo = await validateCsv(file, template, isEmail)
      setProtectedCsvInfo(validationInfo)
      setPhase(ProtectPhase.PREVIEW)
    } catch (err) {
      setErrorMessage(err.message)
      setPhase(ProtectPhase.READY)
    }
  }

  async function onFileUpload() {
    setPhase(ProtectPhase.UPLOADING)
    if (!campaignId) {
      throw new Error('No campaign id')
    }
    if (!selectedFile) {
      throw new Error('No csv selected')
    }
    try {
      const uploadTimeStart = performance.now()
      await protectAndUploadCsv(campaignId, selectedFile, template)
      const uploadTimeEnd = performance.now()
      sendTiming(
        'Contacts file',
        'protected upload',
        uploadTimeEnd - uploadTimeStart
      )
      setPhase(ProtectPhase.PROCESSING)
    } catch (err) {
      setErrorMessage(err.message)
      setPhase(ProtectPhase.PREVIEW)
    }
  }

  const messageBInput = (
    <>
      <h2>Create password protected message</h2>
      <h4>Message B</h4>
      <p>
        The content below is what your recipients see after opening their
        password protected mail using their unique password.
        <br />
        <br />
        To personalise your message, include keywords that are surrounded by
        double curly braces. The keywords in your message template should match
        the headers in your recipients CSV file.
      </p>
      <TextArea
        highlight={true}
        placeholder="Enter password protected message here"
        value={template}
        onChange={setTemplate}
      />

      <div className="separator"></div>
    </>
  )

  const messageBPreview = (
    <>
      <InfoBlock>
        <li>
          <i className="bx bx-user-check"></i>
          <p>{protectedCsvInfo?.numRecipients} recipients</p>
        </li>
        <li>
          <i className="bx bx-file"></i>
          <p>{protectedCsvInfo?.csvFilename}</p>
        </li>
        <li>
          <i className="bx bx-message-dots"></i>
          <p>Preview:</p>
        </li>
        <br />
        <li>
          {protectedCsvInfo?.preview && (
            <ProtectedPreview html={protectedCsvInfo?.preview} />
          )}
        </li>
      </InfoBlock>
      <div className="progress-button">
        <TextButton minButtonWidth onClick={() => setPhase(ProtectPhase.READY)}>
          Back
        </TextButton>
        <PrimaryButton
          onClick={onFileUpload}
          disabled={phase === ProtectPhase.UPLOADING}
        >
          {phase === ProtectPhase.UPLOADING ? (
            <>
              Protecting Messages
              <i className="bx bx-loader-alt bx-spin"></i>
            </>
          ) : (
            'Confirm'
          )}
        </PrimaryButton>
      </div>
    </>
  )

  const uploadRecipients = (
    <>
      <EmailRecipients
        csvFilename={csvFilename}
        numRecipients={numRecipients}
        params={[]}
        isProcessing={isProcessing}
        protect={true}
        template={template}
        onFileSelected={onFileSelected}
        forceReset={phase === ProtectPhase.READY}
        onNext={onNext}
      ></EmailRecipients>
      {phase === ProtectPhase.READY && csvFilename && (
        <div className="progress-button">
          <TextButton
            minButtonWidth
            onClick={() => setPhase(ProtectPhase.DONE)}
          >
            Cancel
          </TextButton>
        </div>
      )}
    </>
  )

  const completeButtons = (
    <div className="progress-button">
      <TextButton minButtonWidth onClick={() => setPhase(ProtectPhase.READY)}>
        Edit Message
      </TextButton>
      <PrimaryButton onClick={onNext}>
        Next <i className="bx bx-right-arrow-alt"></i>
      </PrimaryButton>
    </div>
  )

  function render() {
    switch (phase) {
      case ProtectPhase.READY:
      case ProtectPhase.VALIDATING:
      default:
        return (
          <>
            {messageBInput}
            {uploadRecipients}
          </>
        )
      case ProtectPhase.PREVIEW:
      case ProtectPhase.UPLOADING:
        return messageBPreview
      case ProtectPhase.PROCESSING:
        return uploadRecipients
      case ProtectPhase.DONE:
        return (
          <>
            {uploadRecipients}
            {completeButtons}
          </>
        )
    }
  }

  return (
    <>
      <sub>Step 2</sub>
      {render()}
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </>
  )
}

export default ProtectedEmailRecipients
