import cx from 'classnames'

import styles from './TextButton.module.scss'

import type { ButtonHTMLAttributes } from 'react'

interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // if true, remove text-decoration
  noUnderline?: boolean
  // if true, follow min-width of primary button
  minButtonWidth?: boolean
}

const TextButton = (props: TextButtonProps) => {
  const { className, noUnderline, minButtonWidth, ...otherProps } = props
  return (
    <button
      type="button"
      className={cx(
        styles.textButton,
        {
          [styles.underline]: !noUnderline,
          [styles.noMinWidth]: !minButtonWidth,
        },
        className
      )}
      {...otherProps}
    ></button>
  )
}

export default TextButton
