import React from 'react'
import styles from './CreateTrialModal.module.scss'
import { ChannelType } from 'classes/Campaign'
import { PrimaryButton, TextButton } from 'components/common'

const CreateTrialModal = ({
  onSuccess,
  channelType,
  numTrials,
}: {
  onSuccess: (useTrial: boolean) => Promise<void>
  channelType: ChannelType
  numTrials: number
}) => {
  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.title}>Create a trial campaign</h2>
        <h5 className={styles.subtitle}>
          You can create {numTrials} trial {channelType}{' '}
          {numTrials > 1 ? 'campaigns' : 'campaign'}!{' '}
        </h5>
        <h5 className={styles.subtitle}>
          Using a trial campaign, you can send 20 {channelType} messages using
          our built-in credentials to learn about Postman.gov.sg&apos;s
          workflow.
        </h5>

        <div className="separator"></div>
        <div className={styles.actions}>
          <TextButton minButtonWidth onClick={() => onSuccess(false)}>
            I already know how to create a campaign
          </TextButton>
          <PrimaryButton onClick={() => onSuccess(true)}>
            Create trial
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}

export default CreateTrialModal
