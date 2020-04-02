import React from 'react'
import { AppBar, PageHeader, ProgressPane } from '../base'
import styles from './AppBase.module.scss'

const steps = [
  { content: 'step one', active: true },
  { content: 'step two', active: false },
  { content: 'step three', active: false }
]

const AppBase = () => {
  return (
    <React.Fragment>
      <AppBar></AppBar>
      <PageHeader title="Set page title here"></PageHeader>
      <div className={styles.content}>
        <ProgressPane steps={steps}></ProgressPane>
      </div>
    </React.Fragment>
  )
}

export default AppBase