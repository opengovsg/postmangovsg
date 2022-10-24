import { useEffect, useRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import cx from 'classnames'
import escapeHTML from 'escape-html'

import styles from './TextArea.module.scss'

const HIGHLIGHT_REGEX = /{{\s*?\w+\s*?}}/g

const TextArea = ({
  id,
  highlight = false,
  singleRow,
  placeholder,
  value,
  onChange,
}: {
  id?: string
  highlight: boolean
  singleRow?: boolean
  placeholder?: string
  value: string
  onChange: (text: string) => void
}) => {
  const minRows = singleRow ? 1 : 7
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // ignores Enter key presses as it triggers a resize on textarea
    if (singleRow && textAreaRef.current) {
      textAreaRef.current.onkeydown = (e) => {
        if (e.keyCode === 13) {
          e.preventDefault()
        }
      }
    }
  }, [singleRow])

  // Remove line breaks for singleRow textarea
  function onTextChange(text: string) {
    onChange(singleRow ? text.replace(/(\r\n|\r|\n)/g, '') : text)
  }

  return (
    <div className={styles.textAreaContainer}>
      {highlight && (
        <div
          className={cx(styles.textArea, styles.highlightBackdrop, {
            [styles.single]: singleRow,
          })}
        >
          <p
            dangerouslySetInnerHTML={{
              __html: highlightHTML(value),
            }}
          ></p>
        </div>
      )}
      <TextareaAutosize
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onTextChange(e.target.value)}
        minRows={minRows}
        className={cx(styles.textArea, { [styles.single]: singleRow })}
        inputRef={(r) => (textAreaRef.current = r)}
      />
    </div>
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
