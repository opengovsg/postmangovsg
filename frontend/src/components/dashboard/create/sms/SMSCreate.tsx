import cx from 'classnames'

import { useState, useEffect, useContext } from 'react'

import styles from '../Create.module.scss'
import BodyTemplate from '../common/BodyTemplate'

import SMSCredentials from './SMSCredentials'
import SMSDetail from './SMSDetail'
import SMSRecipients from './SMSRecipients'
import SMSSend from './SMSSend'

import type { SMSCampaign } from 'classes'
import { SMSProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'
import {
  SMS_WARN_EXCEED_CHARACTER_THRESHOLD,
  SMS_ERROR_EXCEED_CHARACTER_THRESHOLD,
  saveTemplate,
} from 'services/sms.service'

const SMS_PROGRESS_STEPS = [
  'Create message',
  'Upload recipients',
  'Insert credentials',
  'Preview and send',
]

const CreateSMS = () => {
  const { campaign } = useContext(CampaignContext)
  const { progress, isCsvProcessing, status, costPerMessage } =
    campaign as SMSCampaign
  const [activeStep, setActiveStep] = useState(progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(SMSProgress.UploadRecipients)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case SMSProgress.CreateTemplate:
        return (
          <BodyTemplate
            setActiveStep={setActiveStep}
            warnCharacterCount={SMS_WARN_EXCEED_CHARACTER_THRESHOLD}
            errorCharacterCount={SMS_ERROR_EXCEED_CHARACTER_THRESHOLD}
            saveTemplate={saveTemplate}
            costPerMessage={costPerMessage}
          />
        )
      case SMSProgress.UploadRecipients:
        return <SMSRecipients setActiveStep={setActiveStep} />
      case SMSProgress.InsertCredentials:
        return <SMSCredentials setActiveStep={setActiveStep} />
      case SMSProgress.Send:
        return <SMSSend setActiveStep={setActiveStep} />
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
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
