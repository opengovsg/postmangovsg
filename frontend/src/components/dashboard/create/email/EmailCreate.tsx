import React, { useState } from 'react'

import { ProgressPane } from 'components/common'
import EmailTemplate from './EmailTemplate'
import EmailRecipients from './EmailRecipients'

import { EmailCampaign, EmailProgress } from 'classes/EmailCampaign'
import styles from '../Create.module.scss'

const EMAIL_PROGRESS_STEPS = [
  'Create Template',
  'Upload Recipients',
  'Send',
]

const CreateEmail = ({ campaign: initialCampaign }: { campaign: EmailCampaign }) => {
  const [activeStep, setActiveStep] = useState(initialCampaign.progress)
  const [campaign, setCampaign] = useState(initialCampaign)

  // Modifies campaign object in state and navigates to next step
  const onNext = (changes: any, next = true) => {
    setCampaign(Object.assign(campaign, changes))
    campaign.setProgress()
    if (next) {
      setActiveStep(activeStep + 1)
    }
  }

  function renderStep() {
    switch (activeStep) {
      case EmailProgress.CreateTemplate:
        return (
          <EmailTemplate subject={campaign.subject} body={campaign.body} onNext={onNext} />
        )
      case EmailProgress.UploadRecipients:
        return (
          <EmailRecipients id={campaign.id} csvFilename={campaign.csvFilename} numRecipients={campaign.numRecipients} onNext={onNext} />
        )
      case EmailProgress.Send:
        return (
          <>Send</>
        )
      default:
        return (<p>Invalid step</p>)
    }
  }


  return (
    <div className={styles.createContainer}>
      <ProgressPane steps={EMAIL_PROGRESS_STEPS} activeStep={activeStep} setActiveStep={setActiveStep} progress={campaign.progress} />
      <div className={styles.stepContainer}>
        {renderStep()}
      </div>
    </div>
  )
}

export default CreateEmail