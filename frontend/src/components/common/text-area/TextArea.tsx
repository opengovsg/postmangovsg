import React from 'react'
import cx from 'classnames'
import TextareaAutosize from 'react-textarea-autosize'
import escapeHTML from 'escape-html'

import styles from './TextArea.module.scss'

const HIGHLIGHT_REGEX = /{{\s*?\w+\s*?}}/g

const TextArea = ({ highlight, singleRow, placeholder, value, onChange }:
  { highlight: boolean; singleRow?: boolean; placeholder: string; value: string; onChange: Function }) => {

  const minRows = singleRow ? 1 : 5

  return (
    <div className={styles.textAreaContainer}>
      {highlight && <div className={cx(styles.textArea, styles.highlightBackdrop, { [styles.single]: singleRow })}>
        <p dangerouslySetInnerHTML={{
          __html: highlightHTML(value),
        }}></p>
      </div>}
      <TextareaAutosize
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        minRows={minRows}
        className={cx(styles.textArea, { [styles.single]: singleRow })}
      />
    </div >
  )
}

function highlightHTML(plainText: any): string {
  if (!plainText) {
    return ''
  }
  return escapeHTML(plainText)
    .replace(/(?:\r\n|\r|\n)/g, '<br>')
    .replace(HIGHLIGHT_REGEX, (match: string) => `<mark>${match}</mark>`)
}

export default TextArea