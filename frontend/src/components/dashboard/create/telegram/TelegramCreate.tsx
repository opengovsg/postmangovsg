import cx from 'classnames'
import React, { useState, useEffect, useContext } from 'react'

import { CampaignContext } from 'contexts/campaign.context'
import { TelegramProgress, Status, TelegramCampaign } from 'classes'
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
  const { progress, isCsvProcessing, status } = campaign as TelegramCampaign
  const [activeStep, setActiveStep] = useState(progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(TelegramProgress.UploadRecipients)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case TelegramProgress.CreateTemplate:
        return <TelegramTemplate setActiveStep={setActiveStep} />
      case TelegramProgress.UploadRecipients:
        return <TelegramRecipients setActiveStep={setActiveStep} />
      case TelegramProgress.InsertCredentials:
        return <TelegramCredentials setActiveStep={setActiveStep} />
      case TelegramProgress.Send:
        return <TelegramSend setActiveStep={setActiveStep} />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
          <TelegramDetail></TelegramDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={TELEGRAM_PROGRESS_STEPS}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            progress={progress}
          />
          <div className={styles.stepContainer}>{renderStep()}</div>
        </>
      )}
    </div>
  )
}

export default CreateTelegram
