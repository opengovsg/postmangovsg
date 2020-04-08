import React from 'react'
import cx from 'classnames'
import TextareaAutosize from 'react-textarea-autosize'

import styles from './TextArea.module.scss'

const HIGHLIGHT_REGEX = /{{\s*\w+\s*}}/g

const TextArea = (props: any) => {
  const { className, highlight, value, onChange } = props

  return (
    <div className={styles.textAreaContainer}>
      {highlight && <div className={styles.highlightBackdrop}>
        <p dangerouslySetInnerHTML={{
          __html: highlightHTML(value),
        }}></p>
      </div>}
      <TextareaAutosize
        value={value}
        onChange={e => onChange(e.target.value)}
        minRows={5}
        className={cx(styles.textArea, className)}
      />
    </div >
  )
}

function highlightHTML(plainText: any): string {
  if (!plainText) {
    return ''
  }
  return escapeHtml(plainText)
    .replace(/(?:\r\n|\r|\n)/g, '<br>')
    .replace(HIGHLIGHT_REGEX, (match) => `<mark>${match}</mark>`)
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default TextArea