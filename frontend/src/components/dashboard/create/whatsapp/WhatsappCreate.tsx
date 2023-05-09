import cx from 'classnames'
import { useContext, useEffect, useState } from 'react'

import styles from '../Create.module.scss'

import { Status } from 'classes/Campaign'
import { WhatsappCampaign, WhatsappProgress } from 'classes/WhatsappCampaign'
import { ProgressPane } from 'components/common'
import WhatsappDetail from 'components/dashboard/create/whatsapp/WhatsappDetail'
import { CampaignContext } from 'contexts/campaign.context'

const WHATSAPP_PROGRESS_STEPS = [
  'Credentials',
  'Preview template',
  'Send test message',
  'Preview and send',
]

const CreateWhatsapp = () => {
  const { campaign } = useContext(CampaignContext)
  const { progress, status, isCsvProcessing } = campaign as WhatsappCampaign
  const [activeStep, setActiveStep] = useState(progress)

  useEffect(() => {
    if (isCsvProcessing) {
      setActiveStep(WhatsappProgress.PreviewTemplate)
    }
  }, [isCsvProcessing])

  function renderStep() {
    switch (activeStep) {
      case WhatsappProgress.SelectCredentials:
      case WhatsappProgress.PreviewTemplate:
      case WhatsappProgress.SendTestMessage:
      case WhatsappProgress.Send:
        return <p>Hello</p>
      default:
        return <p>Invalid step</p>
    }
  }

  return (
    <div className={styles.createContainer}>
      {status !== Status.Draft ? (
        <div className={cx(styles.stepContainer, styles.detailContainer)}>
          <WhatsappDetail></WhatsappDetail>
        </div>
      ) : (
        <>
          <ProgressPane
            steps={WHATSAPP_PROGRESS_STEPS}
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

export default CreateWhatsapp
