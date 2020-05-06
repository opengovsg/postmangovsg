import React from 'react'
import cx from 'classnames'
import styles from './ProgressPane.module.scss'

const ProgressItem = ({ step, number, isActive, onClick, isEnabled }: { step: string; number: number; isActive: boolean; onClick: any; isEnabled: boolean }) => {
  return (
    <a className={cx(styles.progressItem, { [styles.active]: isActive, [styles.enabled]: isEnabled })} onClick={isEnabled ? onClick : undefined}>
      <div className={styles.number}>{number}</div>
      <span>{step}</span>
    </a>
  )
}

const ProgressPane = ({ steps, activeStep, setActiveStep, progress }: { steps: string[]; activeStep: number; setActiveStep: Function; progress: number }) => {
  return (
    <div className={styles.progressPane}>
      {
        steps.map((step: string, index: number) =>
          <ProgressItem step={step} key={index} number={index + 1} isActive={activeStep === index}
            isEnabled={index <= progress} onClick={() => setActiveStep(index)}
          ></ProgressItem>
        )
      }
    </div >
  )
}

export default ProgressPane