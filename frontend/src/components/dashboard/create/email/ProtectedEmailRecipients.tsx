import {
  useState,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'

import { useParams } from 'react-router-dom'

import isEmail from 'validator/lib/isEmail'

import styles from '../Create.module.scss'

import EmailRecipients from './EmailRecipients'

import { EmailCampaign, EmailProgress } from 'classes'
import {
  PrimaryButton,
  TextButton,
  TextArea,
  DetailBlock,
  ErrorBlock,
  ProtectedPreview,
  Checkbox,
  StepHeader,
  StepSection,
} from 'components/common'
import SaveDraftModal from 'components/dashboard/create/save-draft-modal'
import { CampaignContext } from 'contexts/campaign.context'
import { FinishLaterModalContext } from 'contexts/finish-later.modal.context'

import { sendTiming } from 'services/ga.service'
import { protectAndUploadCsv } from 'services/protect-csv.service'
import { ProtectedCsvInfo, validateCsv } from 'services/validate-csv.service'

enum ProtectPhase {
  READY,
  VALIDATING,
  PREVIEW,
  UPLOADING,
  PROCESSING,
  DONE,
}

const ProtectedEmailRecipients = ({
  setActiveStep,
}: {
  setActiveStep: Dispatch<SetStateAction<EmailProgress>>
}) => {
  const { campaign } = useContext(CampaignContext)
  const {
    csvFilename,
    numRecipients,
    isCsvProcessing: isProcessing,
  } = campaign as EmailCampaign
  const { setFinishLaterContent } = useContext(FinishLaterModalContext)
  const [template, setTemplate] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File>()
  const [removeEmptyLines, setRemoveEmptyLines] = useState(false)
  const [protectedCsvInfo, setProtectedCsvInfo] = useState<ProtectedCsvInfo>()
  const { id: campaignId } = useParams<{ id: string }>()

  const [phase, setPhase] = useState<ProtectPhase>(
    computePhase(numRecipients, isProcessing)
  )

  useEffect(() => {
    setPhase(computePhase(numRecipients, isProcessing))
  }, [isProcessing, numRecipients])

  // Set callback for finish later button
  useEffect(() => {
    setFinishLaterContent(<SaveDraftModal />)
    return () => {
      setFinishLaterContent(null)
    }
  }, [setFinishLaterContent])

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
      const validationInfo = await validateCsv({
        file,
        template,
        removeEmptyLines,
        recipientValidator: isEmail,
      })
      setProtectedCsvInfo(validationInfo)
      setPhase(ProtectPhase.PREVIEW)
    } catch (err) {
      setErrorMessage((err as Error).message)
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
      await protectAndUploadCsv({
        campaignId: +campaignId,
        file: selectedFile,
        template,
        removeEmptyLines,
      })
      const uploadTimeEnd = performance.now()
      sendTiming(
        'Contacts file',
        'protected upload',
        uploadTimeEnd - uploadTimeStart
      )
      setPhase(ProtectPhase.PROCESSING)
    } catch (err) {
      setErrorMessage((err as Error).message)
      setPhase(ProtectPhase.PREVIEW)
    }
  }

  const messageBInput = (
    <>
      <StepSection>
        <StepHeader
          title="Create password protected message"
          subtitle="Step 2"
        />
        <div>
          <h4>
            <label htmlFor="protectedMessage">Message B</label>
          </h4>
          <p>
            The content below is what your recipients see after opening their
            password protected mail using their unique password.
            <br />
            <br />
            To personalise your message, include keywords that are surrounded by
            double curly braces. The keywords in your message template should
            match the headers in your recipients CSV file.
          </p>
          <p>
            <b>Note:</b> For security reasons, we do not store password
            protected messages. You will lose the content below if you refresh
            your tab or go back to Step 1 to edit.
          </p>
          <TextArea
            id="protectedMessage"
            highlight={true}
            placeholder="Enter password protected message here"
            value={template}
            onChange={setTemplate}
          />
          <Checkbox checked={removeEmptyLines} onChange={setRemoveEmptyLines}>
            <p>
              <b>Remove empty lines.</b> When checked, use {'<p></p>'} to
              preserve empty lines.
            </p>
          </Checkbox>
        </div>
      </StepSection>
    </>
  )

  const messageBPreview = (
    <>
      <StepSection>
        <StepHeader
          title="Confirm password protected message"
          subtitle="Step 2"
        >
          <p>
            If you choose to edit your message, do note that you will have to
            re-upload your recipients list.
          </p>
          <p>
            <b>Note:</b> For security reasons, we do not store password
            protected messages. You will lose the content below if you refresh
            your tab or go back to Step 1 to edit.
          </p>
        </StepHeader>
        <DetailBlock>
          <li>
            <i className="bx bx-user-check"></i>
            <p>{protectedCsvInfo?.numRecipients} recipients</p>
          </li>
          <li>
            <i className="bx bx-file"></i>
            <p>{protectedCsvInfo?.csvFilename}</p>
          </li>
        </DetailBlock>
      </StepSection>
      {protectedCsvInfo?.preview && (
        <StepSection>
          <div>
            <h4>Message B</h4>
          </div>
          <DetailBlock className={styles.protectedPreview}>
            <li>
              <b>Results</b>
            </li>
            <li>
              <ProtectedPreview html={protectedCsvInfo?.preview} />
            </li>
          </DetailBlock>
        </StepSection>
      )}
      <div className="progress-button">
        <TextButton minButtonWidth onClick={() => setPhase(ProtectPhase.READY)}>
          Previous
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
        setActiveStep={setActiveStep}
        template={template}
        onFileSelected={onFileSelected}
        forceReset={phase === ProtectPhase.READY}
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
      <TextButton
        className={styles.darkBlueText}
        minButtonWidth
        onClick={() => setPhase(ProtectPhase.READY)}
      >
        Edit Message
      </TextButton>
      <PrimaryButton onClick={() => setActiveStep((s) => s + 1)}>
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
      {render()}
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </>
  )
}

export default ProtectedEmailRecipients
