import { useState } from 'react'
import * as React from 'react'
import styles from '../RichTextEditor.module.scss'

interface LinkControlProps {
  currentState: any
  expanded: boolean
  onChange: (key: string, ...vals: string[]) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const LinkForm = ({
  initialState,
  onSubmit,
}: {
  initialState: any
  onSubmit: ({ title, url }: { title: string; url: string }) => void
}) => {
  const { link, selectionText } = initialState
  const [title, setTitle] = useState(link?.title || selectionText)
  const [url, setURL] = useState(link?.target || '')

  function stopPropagation(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
  function showPopover() {
    onExpandEvent()
  }

  function addLink({ title, url }: { title: string; url: string }) {
    onChange('link', title, url, '_blank')
  }

  return (
    <div className={styles.linkControl}>
      <div onClick={showPopover} className="rdw-option-wrapper">
        <i className="bx bx-link"></i>
      </div>
      {expanded && <LinkForm initialState={currentState} onSubmit={addLink} />}
    </div>
  )
}
