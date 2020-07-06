import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { uploadProtectedFileToS3 } from 'services/upload.service'
import {
  CsvStatus,
  extractTemplateParams,
  validateCsv,
  encryptCsv,
} from 'services/protected.service'
import {
  FileInput,
  CsvUpload,
  ErrorBlock,
  PreviewBlock,
  PrimaryButton,
  SampleCsv,
  TextArea,
  InfoBlock,
} from 'components/common'
import { EmailCampaign } from 'classes'
import { sendTiming } from 'services/ga.service'

import styles from '../Create.module.scss'

const ProtectedEmailRecipients = ({
  csvFilename: initialCsvFilename,
  numRecipients: initialNumRecipients,
  params,
  onNext,
}: {
  csvFilename: string
  numRecipients: number
  params: Array<string>
  onNext: (changes: Partial<EmailCampaign>, next?: boolean) => void
}) => {
  const [content, setContent] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isEncryptionComplete, setIsEncryptionComplete] = useState(false)
  const [tempFile, setTempFile] = useState<File>()
  const [csvInfo, setCsvInfo] = useState<CsvStatus>({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const { id: campaignId } = useParams()

  const { csvFilename, numRecipients = 0 } = csvInfo

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    onNext({ csvFilename, numRecipients }, false)
  }, [csvFilename, numRecipients, onNext])

  function renderCreateMessageB() {
    return (
      <>
        <h2>Create password protected message</h2>
        <h4>Message B</h4>
        <p>
          The content below is what your recipients see after opening their
          password protected mail using their unique password. You can keep
          editing until you are ready to encrypt the message.
        </p>
        <TextArea
          highlight={true}
          placeholder="Enter password protected message here"
          value={content}
          onChange={setContent}
        />

        <div className="separator"></div>
      </>
    )
  }

  async function onFileSelected(files: File[]) {
    setErrorMessage('')
    setIsEncryptionComplete(false)

    try {
      // user did not select a file
      if (!files[0] || !campaignId) {
        return
      }
      setTempFile(files[0])
      const paramsB = await extractTemplateParams(content)
      const allParams = paramsB.concat(params)
      const csvInfo = await validateCsv(files[0], allParams)

      setCsvInfo(csvInfo)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  async function handleUpload() {
    setIsUploading(true)
    // hydrate templates and encrypt content
    if (!tempFile) {
      setErrorMessage('Error encrypting file')
      return
    }
    try {
      const file = await encryptCsv(tempFile)
      const uploadTimeStart = performance.now()
      await uploadProtectedFileToS3(campaignId, file)
      const uploadTimeEnd = performance.now()
      sendTiming('Contacts file', 'upload', uploadTimeEnd - uploadTimeStart)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
      setIsEncryptionComplete(true)
    }
  }

  return (
    <>
      <sub>Step 2</sub>
      {!csvInfo?.numRecipients && renderCreateMessageB()}

      <h2>Upload recipient list in CSV format</h2>
      <p>
        Only CSV format files are allowed. If you have an Excel file, please
        convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file <b>must include</b>:<br />
        1. Recipient column with recipients&apos; email addresses
        <br />
        2. Password column with recipients&apos; passwords to open registered
        mail
        <br />
        3. All keywords used in Message B
      </p>
      <br />

      <CsvUpload
        isCsvProcessing={false}
        csvInfo={csvInfo}
        onErrorClose={() =>
          setCsvInfo((info) => ({ ...info, csvError: undefined }))
        }
      >
        <FileInput
          isProcessing={false}
          onFileSelected={onFileSelected}
          label="Select"
        />
        <p>or</p>
        <SampleCsv
          protect
          contentTemplate={content}
          params={params}
          defaultRecipient="user@email.com"
        />
      </CsvUpload>

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>

      {!!csvInfo.numRecipients && (
        <>
          <h4>Message B Preview</h4>
          <p>
            The content below is what your recipients see after opening their
            password protected mail using their unique password. You can keep
            editing until you are ready to encrypt the message.
          </p>
          <p>
            <b>Note</b>: Once you have encrypted Message B, you have to create
            new message if you wish to edit any detail. Editing the message will
            require you to upload your recipients all over again.
          </p>
          {isUploading || isEncryptionComplete ? (
            <InfoBlock className={styles.greenInfoBlock}>
              <li>
                {isUploading ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin"></i>
                    <span>
                      Message encryption in progress. Do not leave the page
                      until done.
                    </span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-check-circle"></i>
                    <span>Password protected message has been encrypted</span>
                  </>
                )}
              </li>
            </InfoBlock>
          ) : (
            <PreviewBlock body={csvInfo.preview || ''} />
          )}
          <div className="separator"></div>
        </>
      )}

      <div className="progress-button">
        {numRecipients > 0 && !isUploading && (
          <a className={styles.editBtn} onClick={() => setCsvInfo({})}>
            Edit
          </a>
        )}
        {numRecipients > 0 && isEncryptionComplete ? (
          <PrimaryButton onClick={onNext}>Next</PrimaryButton>
        ) : (
          <PrimaryButton disabled={!numRecipients} onClick={handleUpload}>
            Encrypt
          </PrimaryButton>
        )}
      </div>
    </>
  )
}

export default ProtectedEmailRecipients
