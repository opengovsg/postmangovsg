import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { EmailProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import EmailTemplate from './EmailTemplate'
import EmailRecipients from './EmailRecipients'
import ProtectedEmailRecipients from './ProtectedEmailRecipients'
import EmailSend from './EmailSend'
import EmailDetail from './EmailDetail'
import EmailCredentials from './EmailCredentials'

import styles from '../Create.module.scss'

const EMAIL_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Send test message',
  'Preview and send',
]

const CreateEmail = () => {
  console.log('EmailCreate')
  const { campaign } = useContext(CampaignContext)
  const [activeStep, setActiveStep] = useState(campaign.progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(EmailProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case EmailProgress.CreateTemplate:
        return <EmailTemplate />
      case EmailProgress.UploadRecipients:
        if (campaign.protect) {
          return <ProtectedEmailRecipients />
        }
        return <EmailRecipients />
      case EmailProgress.SendTestMessage:
        return <EmailCredentials />
      case EmailProgress.Send:
        return <EmailSend />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <EmailDetail></EmailDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={EMAIL_PROGRESS_STEPS}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            progress={campaign.progress}
            disabled={campaign.isCsvProcessing}
          />
          <div className={styles.stepContainer}>{renderStep()}</div>
        </>
      )}
    </div>
  )
}

export default CreateEmail
