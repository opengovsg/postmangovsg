import cx from 'classnames'

import styles from './Chip.module.scss'

interface ChipProps {
  label: string
  selected: boolean
}

export const Chip = ({ label, selected }: ChipProps) => {
  return (
    <div className={cx(styles.chip, { [styles.selected]: selected })}>
      {label}
    </div>
  )
}
