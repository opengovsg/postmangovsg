import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { TelegramProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import TelegramTemplate from './TelegramTemplate'
import TelegramRecipients from './TelegramRecipients'
import TelegramCredentials from './TelegramCredentials'
import TelegramSend from './TelegramSend'
import TelegramDetail from './TelegramDetail'

import styles from '../Create.module.scss'

const TELEGRAM_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Insert credentials',
  'Preview and send',
]

const CreateTelegram = () => {
  const { campaign } = useContext(CampaignContext)
  const [activeStep, setActiveStep] = useState(campaign.progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(TelegramProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case TelegramProgress.CreateTemplate:
        return <TelegramTemplate />
      case TelegramProgress.UploadRecipients:
        return <TelegramRecipients />
      case TelegramProgress.InsertCredentials:
        return <TelegramCredentials />
      case TelegramProgress.Send:
        return <TelegramSend />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <TelegramDetail></TelegramDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={TELEGRAM_PROGRESS_STEPS}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            progress={campaign.progress}
          />
          <div className={styles.stepContainer}>{renderStep()}</div>
        </>
      )}
    </div>
  )
}

export default CreateTelegram
