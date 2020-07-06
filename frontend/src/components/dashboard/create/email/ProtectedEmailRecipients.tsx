import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import cx from 'classnames'

import { uploadEncryptedFileToS3 } from 'services/upload.service'
import {
  CsvStatus,
  extractTemplateParams,
  validateCsv,
  encryptCsv,
} from 'services/protectedemail.service'
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
  const [isUploadingToServer, setIsUploadingToServer] = useState(false)
  const [tempFile, setTempFile] = useState<File>()
  const [encryptedFile, setEncryptedFile] = useState<File>()
  const [csvInfo, setCsvInfo] = useState<CsvStatus>({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [encryptionComplete, setEncryptionComplete] = useState(false)
  const [isCsvEncrypting, setIsCsvEncrypting] = useState(false)
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

  // Handle file upload
  async function uploadFile(files: File[]) {
    setIsUploading(true)
    setErrorMessage('')

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
    } finally {
      setIsUploading(false)
    }
  }

  // // Hide csv error from previous upload and delete from db
  function clearCsvStatus() {
    if (campaignId) {
      setCsvInfo((info) => ({ ...info, csvError: undefined }))
    }
  }

  async function onEncryptCsv() {
    if (!tempFile) {
      setErrorMessage('Error encrypting file')
      return
    }
    setIsCsvEncrypting(true)
    const encryptedFile = await encryptCsv(tempFile)
    setEncryptedFile(encryptedFile)
    setEncryptionComplete(true)
    setIsCsvEncrypting(false)
  }

  function resetUpload() {
    setEncryptionComplete(false)
    setCsvInfo({})
    setContent('')
  }

  async function handleNext(e: any) {
    if (!encryptedFile) {
      setErrorMessage('Error encrypting file')
      return
    }
    await uploadFileToServer(encryptedFile)
    onNext(e)
  }

  // Handle file upload
  async function uploadFileToServer(file: File) {
    setIsUploadingToServer(true)
    setErrorMessage('')
    const uploadTimeStart = performance.now()

    try {
      // user did not select a file
      if (!file || !campaignId) {
        return
      }
      clearCsvStatus()
      await uploadEncryptedFileToS3(+campaignId, file)

      const uploadTimeEnd = performance.now()
      sendTiming(
        'Encrypted contacts file',
        'upload',
        uploadTimeEnd - uploadTimeStart
      )

      // setIsCsvProcessing(true)
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploadingToServer(false)
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
        onErrorClose={clearCsvStatus}
      >
        <FileInput
          isProcessing={isUploading}
          onFileSelected={uploadFile}
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
            new message if you wish to edit any detail. Creating a new message
            will require you to upload your recipients all over again.
          </p>
          {!encryptionComplete && (
            <>
              <PreviewBlock body={csvInfo.preview || ''} />
              <div className="progress-button">
                <PrimaryButton
                  className={styles.darkBlueBtn}
                  onClick={onEncryptCsv}
                >
                  Encrypt
                </PrimaryButton>
              </div>
            </>
          )}
          {isCsvEncrypting && (
            <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')}></i>
          )}
          {encryptionComplete && (
            <>
              <InfoBlock className={styles.greenInfoBlock}>
                <li>
                  <i className="bx bx-check-circle"></i>
                  <span>Password protected message has been encrypted</span>
                </li>
              </InfoBlock>
              <div className="progress-button">
                <PrimaryButton
                  className={styles.darkBlueBtn}
                  onClick={resetUpload}
                >
                  Create new message
                </PrimaryButton>
              </div>
            </>
          )}
          <div className="separator"></div>
        </>
      )}

      <div className="progress-button">
        <PrimaryButton
          disabled={!encryptionComplete}
          onClick={(e) => handleNext(e)}
        >
          Next{' '}
          {isUploadingToServer && <i className="bx bx-loader-alt bx-spin"></i>}
        </PrimaryButton>
      </div>
    </>
  )
}

export default ProtectedEmailRecipients
