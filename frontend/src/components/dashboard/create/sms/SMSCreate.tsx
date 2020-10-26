import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { SMSCampaign, SMSProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import SMSTemplate from './SMSTemplate'
import SMSRecipients from './SMSRecipients'
import SMSCredentials from './SMSCredentials'
import SMSSend from './SMSSend'
import SMSDetail from './SMSDetail'

import styles from '../Create.module.scss'

const SMS_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Insert credentials',
  'Preview and send',
]

const CreateSMS = () => {
  const { campaign } = useContext(CampaignContext)
  const { progress, isCsvProcessing, status } = campaign as SMSCampaign
  const [activeStep, setActiveStep] = useState(progress)

  useEffect(() => {
    setActiveStep(progress)
  }, [progress])

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(SMSProgress.UploadRecipients)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case SMSProgress.CreateTemplate:
        return <SMSTemplate setActiveStep={setActiveStep} />
      case SMSProgress.UploadRecipients:
        return <SMSRecipients setActiveStep={setActiveStep} />
      case SMSProgress.InsertCredentials:
        return <SMSCredentials setActiveStep={setActiveStep} />
      case SMSProgress.Send:
        return <SMSSend />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <SMSDetail></SMSDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={SMS_PROGRESS_STEPS}
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

export default CreateSMS
