import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  PrimaryButton,
  TextButton,
  TextArea,
  InfoBlock,
} from 'components/common'
import EmailRecipients from './EmailRecipients'
import { EmailCampaign } from 'classes'
import { sendTiming } from 'services/ga.service'

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
  const [tempCsvInfo, setTempCsvInfo] = useState<{
    tempNumRecipients: number
    tempCsvFilename: string
    tempPreview: string
  }>()
  const { id: campaignId } = useParams()

  let initialPhase = ProtectPhase.PREVIEW
  if (numRecipients) {
    initialPhase = ProtectPhase.DONE
  }
  if (isProcessing) {
    initialPhase = ProtectPhase.PROCESSING
  }
  const [phase, setPhase] = useState<ProtectPhase>(initialPhase)

  async function onFileSelected(campaignId: number, file: File) {
    setErrorMessage('')
    setPhase(ProtectPhase.VALIDATING)
    try {
      // user did not select a file
      // TODO: Validate CSV info
      setTempCsvInfo(tempCsvInfo)
      setPhase(ProtectPhase.PREVIEW)
    } catch (err) {
      setErrorMessage(err.message)
      setPhase(ProtectPhase.READY)
    }
  }

  async function onFileUpload() {
    setPhase(ProtectPhase.UPLOADING)
    // hydrate templates and encrypt content
    if (!campaignId) {
      throw new Error('No campaign id')
    }
    if (!tempCsvInfo?.tempCsvFilename) {
      throw new Error('No csv selected')
    }
    try {
      const uploadTimeStart = performance.now()
      // TODO: parse and upload
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
          <p>{tempCsvInfo?.tempCsvFilename} recipients</p>
        </li>
        <li>
          <i className="bx bx-file"></i>
          <p>{tempCsvInfo?.tempCsvFilename}</p>
        </li>
        <hr />
        <li>
          <p>{tempCsvInfo?.tempPreview}</p>
        </li>
      </InfoBlock>
      <div className="progress-button">
        <TextButton onClick={() => setPhase(ProtectPhase.READY)}>
          Back
        </TextButton>
        <PrimaryButton onClick={onFileUpload}>Confirm</PrimaryButton>
      </div>
    </>
  )

  const uploadRecipients = (
    <EmailRecipients
      csvFilename={csvFilename}
      numRecipients={numRecipients}
      params={[]}
      isProcessing={isProcessing}
      protect={true}
      template={template}
      onFileSelected={onFileSelected}
      onNext={onNext}
    ></EmailRecipients>
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
      case ProtectPhase.DONE:
        return uploadRecipients
    }
  }

  return (
    <>
      <sub>Step 2</sub>
      {render()}
    </>
  )
}

export default ProtectedEmailRecipients
