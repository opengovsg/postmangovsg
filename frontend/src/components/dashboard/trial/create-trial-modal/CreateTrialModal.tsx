import React, { useState } from 'react'
import styles from './CreateTrialModal.module.scss'
import { ChannelType } from 'classes/Campaign'
import { ErrorBlock, PrimaryButton, TextButton } from 'components/common'

const CreateTrialModal = ({
  onSuccess,
  channelType,
  numTrials,
}: {
  onSuccess: (useTrial: boolean) => Promise<void>
  channelType: ChannelType
  numTrials: number
}) => {
  const [errorMessage, setErrorMessage] = useState('')
  async function createCampaign() {
    try {
      await onSuccess(false)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }
  async function createTrial() {
    try {
      await onSuccess(true)
    } catch (err) {
      console.log('error', err)
      setErrorMessage(err.message)
    }
  }
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
      </div>

      <div className="separator"></div>
      <div className={styles.actions}>
        <TextButton minButtonWidth onClick={createCampaign}>
          I already know how to create a campaign
        </TextButton>
        <PrimaryButton onClick={createTrial}>Create trial</PrimaryButton>
      </div>
      <ErrorBlock>{errorMessage}</ErrorBlock>
    </>
  )
}

export default CreateTrialModal
