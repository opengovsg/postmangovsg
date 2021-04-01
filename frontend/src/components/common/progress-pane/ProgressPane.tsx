import cx from 'classnames'
import styles from './ProgressPane.module.scss'

const ProgressItem = ({
  step,
  number,
  isActive,
  onClick,
  isEnabled,
}: {
  step: string
  number: number
  isActive: boolean
  onClick: any
  isEnabled: boolean
}) => {
  return (
    <div
      role="menuitem"
      aria-current={isActive ? 'step' : undefined}
      className={cx(styles.progressItem, {
        [styles.active]: isActive,
        [styles.enabled]: isEnabled,
      })}
      onClick={isEnabled ? onClick : undefined}
    >
      <div className={styles.number}>{number}</div>
      <span>{step}</span>
    </div>
  )
}

const ProgressPane = ({
  steps,
  activeStep,
  setActiveStep,
  progress,
  disabled,
}: {
  steps: string[]
  activeStep: number
  setActiveStep: (step: number) => void
  progress: number
  disabled?: boolean
}) => {
  return (
    <nav aria-label="progress" className={styles.progressPane}>
      {steps.map((step: string, index: number) => (
        <ProgressItem
          step={step}
          key={index}
          number={index + 1}
          isActive={activeStep === index}
          isEnabled={!disabled && index <= progress}
          onClick={() => setActiveStep(index)}
        ></ProgressItem>
      ))}
    </nav>
  )
}

export default ProgressPane
