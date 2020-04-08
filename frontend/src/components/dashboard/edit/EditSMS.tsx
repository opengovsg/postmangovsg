import React, { useState } from 'react'
import { ProgressPane } from 'components/common'
import { SMSCampaign } from 'classes'

import styles from './Edit.module.scss'

const SMS_STEPS = [
  'Create Message',
  'Upload Recipients',
  'Preview',
  'Insert Credentials',
  'View Statistics',
]

const EditSMS = ({ campaign }: { campaign: SMSCampaign }) => {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className={styles.editContainer}>
      <ProgressPane steps={SMS_STEPS} activeStep={activeStep} setActiveStep={setActiveStep} progress={campaign.progress}/>
      <div>
        {JSON.stringify(campaign)}
      </div>
    </div>
  )
}

export default EditSMS