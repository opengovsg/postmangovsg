import React from 'react'

import { TitleBar, PrimaryButton } from 'components/common'
import styles from './Campaigns.module.scss'

const Campaigns = () => {
  return (
    <>
      <TitleBar title="Welcome, Agency">
        <PrimaryButton>Create campaign</PrimaryButton>
      </TitleBar>
        Campaigns!
    </>
  )
}

export default Campaigns