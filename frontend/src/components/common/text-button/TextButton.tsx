import type { ButtonHTMLAttributes } from 'react'
import cx from 'classnames'

import defaultStyles from './TextButton.module.scss'

interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // if true, remove text-decoration
  noUnderline?: boolean
  // if true, follow min-width of primary button
  minButtonWidth?: boolean
  overrideStyles?: { readonly [key: string]: string }
}

const TextButton = (props: TextButtonProps) => {
  const {
    className,
    noUnderline,
    minButtonWidth,
    overrideStyles,
    ...otherProps
  } = props
  const styles = overrideStyles || defaultStyles
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
