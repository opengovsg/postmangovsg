import React, { useState } from 'react'
import styles from './RichTextEditor.module.scss'

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
    // TODO: Validate that url is valid or if it contains a variable
    onChange(imgSrc, 'auto', '100%', '')
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.item}>
        <label>URL</label>
        <div className={styles.control}>
          <input
            value={imgSrc}
            type="text"
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
  function showPopover() {
    onExpandEvent()
  }

  return (
    <div className={styles.imageControl}>
      <div onClick={showPopover} className="rdw-option-wrapper">
        <i className="bx bx-image"></i>
      </div>
      {expanded && <ImageForm onChange={onChange} />}
    </div>
  )
}
