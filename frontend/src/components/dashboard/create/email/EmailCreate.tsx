import React, { useState, useEffect, useCallback } from 'react'
import { cloneDeep } from 'lodash'

import { EmailCampaign, EmailProgress } from 'classes/EmailCampaign'
import { ProgressPane } from 'components/common'
import EmailTemplate from './EmailTemplate'
import EmailRecipients from './EmailRecipients'
import EmailSend from './EmailSend'
import EmailDetail from './EmailDetail'
import EmailCredentials from './EmailCredentials'

import styles from '../Create.module.scss'
import { Status } from 'classes'

const EMAIL_PROGRESS_STEPS = [
  'Create Template',
  'Upload Recipients',
  'Send Test Message',
  'Send',
]

const CreateEmail = ({
  campaign: initialCampaign,
}: {
  campaign: EmailCampaign
}) => {
  const [activeStep, setActiveStep] = useState(initialCampaign.progress)
  const [campaign, setCampaign] = useState(initialCampaign)

  // Modifies campaign object in state and navigates to next step
  const onNext = useCallback((changes: any, next = true) => {
    setCampaign((c) => {
      const updatedCampaign = Object.assign(
        cloneDeep(c),
        changes
      ) as EmailCampaign
      updatedCampaign.setProgress()
      return updatedCampaign
    })
    if (next) {
      setActiveStep((s) => s + 1)
    }
  }, [])

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(EmailProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case EmailProgress.CreateTemplate:
        return (
          <EmailTemplate
            subject={campaign.subject}
            body={campaign.body}
            replyTo={campaign.replyTo}
            onNext={onNext}
          />
        )
      case EmailProgress.UploadRecipients:
        return (
          <EmailRecipients
            params={campaign.params}
            csvFilename={campaign.csvFilename}
            numRecipients={campaign.numRecipients}
            isProcessing={campaign.isCsvProcessing}
            onNext={onNext}
          />
        )
      case EmailProgress.SendTestMessage:
        return (
          <EmailCredentials
            hasCredential={campaign.hasCredential}
            onNext={onNext}
          />
        )
      case EmailProgress.Send:
        return (
          <EmailSend numRecipients={campaign.numRecipients} onNext={onNext} />
        )
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <EmailDetail
            id={campaign.id}
            name={campaign.name}
            sentAt={campaign.sentAt}
            numRecipients={campaign.numRecipients}
          ></EmailDetail>
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
