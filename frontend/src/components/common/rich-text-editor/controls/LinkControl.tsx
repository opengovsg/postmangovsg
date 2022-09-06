import { useState } from 'react'

import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'

import styles from '../RichTextEditor.module.scss'

import CloseButton from 'components/common/close-button'

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
  doCollapse,
}: {
  initialState: any
  onSubmit: ({ title, url }: { title: string; url: string }) => void
  doCollapse: () => void
}) => {
  const { link, selectionText } = initialState
  const [title, setTitle] = useState(link?.title || selectionText)
  const [url, setURL] = useState(link?.target || '')

  function stopPropagation(e: ReactMouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSubmit({ title, url })
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.top}>
        <div>
          <p className={styles.header}>Insert link</p>
        </div>
        <CloseButton onClick={doCollapse} className={styles.closeButton} />
      </div>
      <div className={styles.item}>
        <label>Text</label>
        <input
          className={styles.control}
          value={title}
          type="text"
          placeholder="Text to display"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={styles.item}>
        <label>Link to</label>
        <input
          className={styles.control}
          value={url}
          type="text"
          placeholder="URL"
          onChange={(e) => setURL(e.target.value)}
        />
      </div>
      <div className={styles.submit}>
        <button type="submit" disabled={!title || !url}>
          Insert
        </button>
      </div>
    </form>
  )
}

export const LinkControl = (props: LinkControlProps) => {
  const { currentState, expanded, onChange, onExpandEvent, doCollapse } = props
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
      {expanded && (
        <LinkForm
          initialState={currentState}
          onSubmit={addLink}
          doCollapse={doCollapse}
        />
      )}
    </div>
  )
}
