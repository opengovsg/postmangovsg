import { useContext, useEffect, useState } from 'react'
import { Status, TelegramCampaign, TelegramProgress } from 'classes'
import cx from 'classnames'
import { ProgressPane } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'
import {
  saveTemplate,
  TELEGRAM_ERROR_EXCEED_CHARACTER_THRESHOLD,
  TELEGRAM_WARN_EXCEED_CHARACTER_THRESHOLD,
} from 'services/telegram.service'

import BodyTemplate from '../common/BodyTemplate'
import styles from '../Create.module.scss'

import TelegramCredentials from './TelegramCredentials'
import TelegramDetail from './TelegramDetail'
import TelegramRecipients from './TelegramRecipients'
import TelegramSend from './TelegramSend'

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
        return (
          <BodyTemplate
            setActiveStep={setActiveStep}
            warnCharacterCount={TELEGRAM_WARN_EXCEED_CHARACTER_THRESHOLD}
            errorCharacterCount={TELEGRAM_ERROR_EXCEED_CHARACTER_THRESHOLD}
            saveTemplate={saveTemplate}
          />
        )
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
            disabled={isCsvProcessing}
          />
          <div className={styles.stepContainer}>{renderStep()}</div>
        </>
      )}
    </div>
  )
}

export default CreateTelegram
