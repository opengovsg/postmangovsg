import React from 'react'
import { NavBar, TitleBar, ProgressPane } from 'components/common'
import styles from './Dashboard.module.scss'

const steps = [
  { content: 'step one', active: true },
  { content: 'step two', active: false },
  { content: 'step three', active: false },
]

const AppBase = () => {
  return (
    <React.Fragment>
      <NavBar></NavBar>
      <TitleBar title="Set page title here"></TitleBar>
      <div className={styles.content}>
        <ProgressPane steps={steps}></ProgressPane>
      </div>
    </React.Fragment>
  )
}

export default AppBase