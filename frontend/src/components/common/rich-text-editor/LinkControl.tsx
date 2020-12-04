import React, { useState } from 'react'
import styles from './RichTextEditor.module.scss'

interface LinkControlProps {
  currentState: any
  expanded: boolean
  onChange: Function
  doExpand: Function
  doCollapse: Function
  onExpandEvent: Function
}

const LinkForm = ({
  initialState,
  onSubmit,
}: {
  initialState: any
  onSubmit: Function
}) => {
  const { link, selectionText } = initialState
  const [title, setTitle] = useState(link?.title || selectionText)
  const [url, setURL] = useState(link?.target || '')

  function stopPropagation(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // TODO: Validate URL
    onSubmit({ title, url })
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.item}>
        <label>Title</label>
        <input
          className={styles.control}
          value={title}
          type="text"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={styles.item}>
        <label>URL</label>
        <input
          className={styles.control}
          value={url}
          type="text"
          onChange={(e) => setURL(e.target.value)}
        />
      </div>
      <div className={styles.submit}>
        <button type="submit" disabled={!title || !url}>
          Add
        </button>
      </div>
    </form>
  )
}

export const LinkControl = (props: LinkControlProps) => {
  const { currentState, expanded, onChange, onExpandEvent } = props
  const { link } = currentState
  function showPopover() {
    onExpandEvent()
  }

  function addLink({ title, url }: { title: string; url: string }) {
    onChange('link', title, url, '_blank')
  }

  function removeLink() {
    onChange('unlink')
  }

  return (
    <div className={styles.linkControl}>
      <button onClick={showPopover} className="rdw-option-wrapper">
        <i className="bx bx-link"></i>
      </button>
      <button
        className="rdw-option-wrapper"
        onClick={removeLink}
        disabled={!link}
      >
        <i className="bx bx-unlink"></i>
      </button>
      {expanded && <LinkForm initialState={currentState} onSubmit={addLink} />}
    </div>
  )
}
