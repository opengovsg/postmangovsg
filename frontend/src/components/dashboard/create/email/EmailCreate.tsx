import cx from 'classnames'
import React, { useState, useEffect, useCallback } from 'react'
import { cloneDeep } from 'lodash'

import { Campaign, EmailCampaign, EmailProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import EmailTemplate from './EmailTemplate'
import EmailRecipients from './EmailRecipients'
import ProtectedEmailRecipients from './ProtectedEmailRecipients'
import EmailSend from './EmailSend'
import EmailDetail from './EmailDetail'
import EmailCredentials from './EmailCredentials'

import styles from '../Create.module.scss'

const EMAIL_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Send test message',
  'Preview and send',
]

const CreateEmail = ({
  campaign: initialCampaign,
  onCampaignChange,
  finishLaterCallbackRef,
}: {
  campaign: EmailCampaign
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
      ) as EmailCampaign
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
      setActiveStep(EmailProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case EmailProgress.CreateTemplate:
        return (
          <EmailTemplate
            from={campaign.from}
            subject={campaign.subject}
            body={campaign.body}
            replyTo={campaign.replyTo}
            protect={campaign.protect}
            onNext={onNext}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      case EmailProgress.UploadRecipients:
        if (campaign.protect) {
          return (
            <ProtectedEmailRecipients
              csvFilename={campaign.csvFilename}
              numRecipients={campaign.numRecipients}
              isProcessing={campaign.isCsvProcessing}
              onNext={onNext}
              onPrevious={onPrevious}
              finishLaterCallbackRef={finishLaterCallbackRef}
            />
          )
        }
        return (
          <EmailRecipients
            params={campaign.params}
            csvFilename={campaign.csvFilename}
            numRecipients={campaign.numRecipients}
            isProcessing={campaign.isCsvProcessing}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        )
      case EmailProgress.SendTestMessage:
        return (
          <EmailCredentials
            hasCredential={campaign.hasCredential}
            protect={campaign.protect}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        )
      case EmailProgress.Send:
        return (
          <EmailSend
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
          <EmailDetail
            id={campaign.id}
            name={campaign.name}
            sentAt={campaign.sentAt}
            numRecipients={campaign.numRecipients}
            redacted={campaign.redacted}
          ></EmailDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={EMAIL_PROGRESS_STEPS}
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

export default CreateEmail
