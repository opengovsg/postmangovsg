import React, { useState } from 'react'
import { cloneDeep } from 'lodash'

import { TelegramCampaign, TelegramProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import TelegramTemplate from './TelegramTemplate'
import TelegramRecipients from './TelegramRecipients'
import TelegramCredentials from './TelegramCredentials'
import TelegramSend from './TelegramSend'

import styles from '../Create.module.scss'

const TELEGRAM_PROGRESS_STEPS = [
  'Create Template',
  'Upload Recipients',
  'Insert Credentials',
  'Send',
]

const CreateTelegram = ({
  campaign: initialCampaign,
}: {
  campaign: TelegramCampaign
}) => {
  const [activeStep, setActiveStep] = useState(initialCampaign.progress)
  const [campaign, setCampaign] = useState(initialCampaign)

  // Modifies campaign object in state and navigates to next step
  const onNext = (changes: any, next = true) => {
    const updatedCampaign = Object.assign(
      cloneDeep(campaign),
      changes
    ) as TelegramCampaign
    updatedCampaign.setProgress()
    setCampaign(updatedCampaign)
    if (next) {
      setActiveStep(activeStep + 1)
    }
  }

  function renderStep() {
    switch (activeStep) {
      case TelegramProgress.CreateTemplate:
        return <TelegramTemplate body={campaign.body} onNext={onNext} />
      case TelegramProgress.UploadRecipients:
        return (
          <TelegramRecipients
            params={campaign.params}
            csvFilename={campaign.csvFilename}
            numRecipients={campaign.numRecipients}
            onNext={onNext}
          />
        )
      case TelegramProgress.InsertCredentials:
        return (
          <TelegramCredentials
            hasCredential={campaign.hasCredential}
            onNext={onNext}
          />
        )
      case TelegramProgress.Send:
        return (
          <TelegramSend
            numRecipients={campaign.numRecipients}
            onNext={onNext}
          />
        )
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}></div>
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
