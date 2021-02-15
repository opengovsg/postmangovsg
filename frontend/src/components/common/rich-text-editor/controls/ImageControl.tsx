import cx from 'classnames'
import React, { useContext, useState } from 'react'
import { EditorContext } from '../RichTextEditor'

import styles from '../RichTextEditor.module.scss'

interface ImageControlProps {
  currentState: any
  expanded: boolean
  onChange: Function
  doExpand: Function
  doCollapse: Function
  onExpandEvent: Function
}

const ImageForm = ({ onChange }: { onChange: Function }) => {
  const [imgSrc, setImgSrc] = useState('')

  function stopPropagation(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onChange(imgSrc, 'auto', '100%', '')
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.item}>
        <div className={styles.control}>
          <input
            value={imgSrc}
            type="text"
            placeholder="Enter file.go.gov.sg link"
            onChange={(e) => setImgSrc(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.submit}>
        <button type="submit" disabled={!imgSrc}>
          Add
        </button>
      </div>
    </form>
  )
}

export const ImageControl = (props: ImageControlProps) => {
  const { expanded, onChange, onExpandEvent } = props
  const { editorState } = useContext(EditorContext)

  function isDisabled(): boolean {
    const selection = editorState.getSelection()
    const anchorKey = selection.getAnchorKey()
    const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)

    const anchorType = anchor.getType()
    return (
      anchorType === 'table-cell' ||
      anchorType === 'unordered-list-item' ||
      anchorType === 'ordered-list-item'
    )
  }

  function showPopover() {
    if (!isDisabled()) onExpandEvent()
  }

  return (
    <div className={styles.imageControl}>
      <div
        onClick={showPopover}
        className={cx('rdw-option-wrapper', {
          'rdw-option-disabled': isDisabled(),
        })}
      >
        <i className="bx bx-image"></i>
      </div>
      {expanded && <ImageForm onChange={onChange} />}
    </div>
  )
}
