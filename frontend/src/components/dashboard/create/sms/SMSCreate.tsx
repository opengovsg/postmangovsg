import React, { useState } from 'react'

import { SMSCampaign, SMSProgress } from 'classes'
import { ProgressPane } from 'components/common'
import SMSTemplate from './SMSTemplate'
import SMSRecipients from './SMSRecipients'

import styles from '../Create.module.scss'

const SMS_PROGRESS_STEPS = [
  'Create Template',
  'Upload Recipients',
  'Insert Credentials',
  'Send',
]

const CreateSMS = ({ campaign: initialCampaign }: { campaign: SMSCampaign }) => {
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
      case SMSProgress.CreateTemplate:
        return (
          <SMSTemplate body={campaign.body} onNext={onNext} />
        )
      case SMSProgress.UploadRecipients:
        return (
          <SMSRecipients csvFilename={campaign.csvFilename} numRecipients={campaign.numRecipients} onNext={onNext} />
        )
      case SMSProgress.InsertCredentials:
        return (
          <>Creds</>
        )
      case SMSProgress.Send:
        return (
          <>Send</>
        )
      default:
        return (<p>Invalid step</p>)
    }
  }


  return (
    <div className={styles.createContainer}>
      <ProgressPane steps={SMS_PROGRESS_STEPS} activeStep={activeStep} setActiveStep={setActiveStep} progress={campaign.progress} />
      <div className={styles.stepContainer}>
        {renderStep()}
      </div>
    </div>
  )
}

export default CreateSMS