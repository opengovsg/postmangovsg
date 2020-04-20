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
      {highlight && <div className={cx(styles.textArea, styles.highlightBackdrop)}>
        <p dangerouslySetInnerHTML={{
          __html: highlightHTML(value),
        }}></p>
      </div>}
      <TextareaAutosize
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        minRows={minRows}
        className={styles.textArea}
      />
      {/* {highlight && (
        <div className={styles.instructions}>
          <h5 >How to use - Personalisation</h5>
          <p>
            Use double curly braces to personalise your message.
            <br/>
            E.g.: Hello <mark>{'{{ name }}'}</mark>, your ID number is <mark>{'{{ id }}'}</mark>
          </p>
        </div>
      )} */}
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