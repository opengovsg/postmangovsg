import { useContext, useEffect, useState } from 'react'

import styles from '../Create.module.scss'

import GovsgDetail from './GovsgDetail'
import GovsgPickTemplate from './GovsgPickTemplate'

import GovsgRecipients from './GovsgRecipients'

import GovsgSingleRecipient from './GovsgSingleRecipient'

import { GovsgCampaign, GovsgProgress, Status } from 'classes'
import { ProgressPane } from 'components/common'
import { CampaignContext } from 'contexts/campaign.context'

const GOVSG_PROGRESS_STEPS = ['Pick a template', 'Upload recipients']

const CreateGovsg = () => {
  const { campaign } = useContext(CampaignContext)
  const { progress, isCsvProcessing, status } = campaign as GovsgCampaign
  const [activeStep, setActiveStep] = useState(progress)

  // If isCsvProcessing, user can only access UploadRecipients tab
  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(GovsgProgress.UploadRecipients)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case GovsgProgress.PickTemplate:
        return <GovsgPickTemplate setActiveStep={setActiveStep} />
      case GovsgProgress.UploadRecipients:
        if ((campaign as GovsgCampaign).forSingleRecipient) {
          return <GovsgSingleRecipient setActiveStep={setActiveStep} />
        }
        return <GovsgRecipients setActiveStep={setActiveStep} />
      default:
        return <p>Invalid step</p>
    }
  }
  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        <GovsgDetail />
      ) : (
        <>
          <ProgressPane
            steps={GOVSG_PROGRESS_STEPS}
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

export default CreateGovsg
