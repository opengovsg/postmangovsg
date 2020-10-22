import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { SMSProgress, Status } from 'classes'
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
  const [activeStep, setActiveStep] = useState(campaign.progress)
  console.log('SMSCreate', activeStep)

  useEffect(() => {
    setActiveStep(campaign.progress)
  }, [campaign.progress])

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(SMSProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case SMSProgress.CreateTemplate:
        return <SMSTemplate />
      case SMSProgress.UploadRecipients:
        return <SMSRecipients />
      case SMSProgress.InsertCredentials:
        return <SMSCredentials />
      case SMSProgress.Send:
        return <SMSSend />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <SMSDetail></SMSDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={SMS_PROGRESS_STEPS}
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

export default CreateSMS
