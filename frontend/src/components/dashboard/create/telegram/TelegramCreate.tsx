import cx from 'classnames'
import React, { useState, useCallback, useEffect } from 'react'
import { cloneDeep } from 'lodash'

import { Campaign, TelegramCampaign, TelegramProgress, Status } from 'classes'
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

const CreateTelegram = ({
  campaign: initialCampaign,
  onCampaignChange,
  finishLaterCallbackRef,
}: {
  campaign: TelegramCampaign
  onCampaignChange: (c: Campaign) => void
  finishLaterCallbackRef: React.MutableRefObject<(() => void) | undefined>
}) => {
  const [activeStep, setActiveStep] = useState(initialCampaign.progress)
  const [campaign, setCampaign] = useState(initialCampaign)

  useEffect(() => {
    onCampaignChange(campaign)
  }, [campaign, onCampaignChange])

  // Modifies campaign object in state and navigates to next step
  const onNext = useCallback((changes: any, next = true) => {
    setCampaign((c) => {
      const updatedCampaign = Object.assign(
        cloneDeep(c),
        changes
      ) as TelegramCampaign
      updatedCampaign.setProgress()
      return updatedCampaign
    })
    if (next) {
      setActiveStep((s) => s + 1)
    }
  }, [])

  const onPrevious = () => setActiveStep((s) => Math.max(s - 1, 0))

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(TelegramProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case TelegramProgress.CreateTemplate:
        return (
          <TelegramTemplate
            body={campaign.body}
            onNext={onNext}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      case TelegramProgress.UploadRecipients:
        return (
          <TelegramRecipients
            params={campaign.params}
            csvFilename={campaign.csvFilename}
            numRecipients={campaign.numRecipients}
            isProcessing={campaign.isCsvProcessing}
            isDemo={!!campaign.demoMessageLimit}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        )
      case TelegramProgress.InsertCredentials:
        return (
          <TelegramCredentials
            hasCredential={campaign.hasCredential}
            isDemo={!!campaign.demoMessageLimit}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        )
      case TelegramProgress.Send:
        return (
          <TelegramSend
            numRecipients={campaign.numRecipients}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        )
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
          <TelegramDetail
            id={campaign.id}
            name={campaign.name}
            sentAt={campaign.sentAt}
            numRecipients={campaign.numRecipients}
            redacted={campaign.redacted}
            isDemo={!!campaign.demoMessageLimit}
          ></TelegramDetail>
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
