import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { cloneDeep } from 'lodash'

import { CampaignContext } from 'contexts/campaign.context'
import { Campaign, SMSCampaign, SMSProgress, Status } from 'classes'
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
  const { campaign, setCampaign } = useContext(CampaignContext)
  const [activeStep, setActiveStep] = useState(campaign.progress)
  console.log('SMSCreate')

  // Modifies campaign object in state and navigates to next step
  const onNext = useCallback(
    (changes: any, next = true) => {
      setCampaign((c) => {
        const updatedCampaign = Object.assign(
          cloneDeep(c),
          changes
        ) as SMSCampaign
        updatedCampaign.setProgress()
        return updatedCampaign
      })
      if (next) {
        setActiveStep((s) => s + 1)
      }
    },
    [setCampaign]
  )

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (campaign.isCsvProcessing) {
      setActiveStep(SMSProgress.UploadRecipients)
    }
  }, [campaign.isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case SMSProgress.CreateTemplate:
        return (
          <SMSTemplate
            body={campaign.body}
            onNext={onNext}
            finishLaterCallbackRef={finishLaterCallbackRef}
          />
        )
      case SMSProgress.UploadRecipients:
        return (
          <SMSRecipients
            params={campaign.params}
            csvFilename={campaign.csvFilename}
            numRecipients={campaign.numRecipients}
            isProcessing={campaign.isCsvProcessing}
            onNext={onNext}
          />
        )
      case SMSProgress.InsertCredentials:
        return (
          <SMSCredentials
            hasCredential={campaign.hasCredential}
            onNext={onNext}
          />
        )
      case SMSProgress.Send:
        return (
          <SMSSend numRecipients={campaign.numRecipients} onNext={onNext} />
        )
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {campaign.status !== Status.Draft ? (
        <div className={styles.stepContainer}>
          <SMSDetail
            id={campaign.id}
            name={campaign.name}
            sentAt={campaign.sentAt}
            numRecipients={campaign.numRecipients}
          ></SMSDetail>
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
