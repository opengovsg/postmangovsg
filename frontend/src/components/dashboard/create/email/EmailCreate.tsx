import cx from 'classnames'

import { useState, useEffect, useContext } from 'react'

import styles from '../Create.module.scss'

import EmailCredentials from './EmailCredentials'
import EmailDetail from './EmailDetail'
import EmailRecipients from './EmailRecipients'
import EmailSend from './EmailSend'
import EmailTemplate from './EmailTemplate'
import ProtectedEmailRecipients from './ProtectedEmailRecipients'

import { EmailCampaign, EmailProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'

const EMAIL_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Send test message',
  'Preview and send',
]

const CreateEmail = () => {
  const { campaign } = useContext(CampaignContext)
  const { progress, isCsvProcessing, status, protect } =
    campaign as EmailCampaign
  const [activeStep, setActiveStep] = useState(progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(EmailProgress.UploadRecipients)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case EmailProgress.CreateTemplate:
        return <EmailTemplate setActiveStep={setActiveStep} />
      case EmailProgress.UploadRecipients:
        if (protect) {
          return <ProtectedEmailRecipients setActiveStep={setActiveStep} />
        }
        return <EmailRecipients setActiveStep={setActiveStep} />
      case EmailProgress.SendTestMessage:
        return <EmailCredentials setActiveStep={setActiveStep} />
      case EmailProgress.Send:
        return <EmailSend />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        // now i have to differentiate between scheduled and detail
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
          <EmailDetail></EmailDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={EMAIL_PROGRESS_STEPS}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            progress={progress}
            disabled={isCsvProcessing}
          />
          <div className={styles.stepContainer}>{renderStep()}</div>
        </>
      )}
    </div>
  )
}

export default CreateEmail
