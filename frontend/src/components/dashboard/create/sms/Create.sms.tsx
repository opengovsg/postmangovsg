import React, { useState } from 'react'

import { SMSCampaign, SMSProgress } from 'classes'
import { ProgressPane } from 'components/common'
import TemplateSMS from './Template.sms'
import styles from '../Create.module.scss'

const SMS_PROGRESS_STEPS = [
  'Create Template',
  'Upload Recipients',
  'Insert Credentials',
  'Send',
]

const CreateSMS = ({ campaign }: { campaign: SMSCampaign }) => {
  const [activeStep, setActiveStep] = useState(0)

  function renderStep() {
    switch (activeStep) {
    case SMSProgress.CreateTemplate:
      return (
        <TemplateSMS body={campaign.body}/>
      )
    case SMSProgress.UploadRecipients:
      return (
        <>Recipients</>
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