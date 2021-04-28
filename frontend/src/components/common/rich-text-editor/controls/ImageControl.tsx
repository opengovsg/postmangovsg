import cx from 'classnames'
import React, { useContext, useState } from 'react'
import { AtomicBlockUtils } from 'draft-js'
import { EditorContext } from '../RichTextEditor'

import styles from '../RichTextEditor.module.scss'

const VARIABLE_REGEX = new RegExp(/^{{\s*?\w+\s*?}}$/)

interface ImageControlProps {
  currentState: any
  expanded: boolean
  onChange: (key: string, ...vals: string[]) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const ImageForm = ({
  onChange,
}: {
  onChange: (key: string, ...vals: string[]) => void
}) => {
  const [imgSrc, setImgSrc] = useState('')
  const [link, setLink] = useState('')

  function stopPropagation(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onChange(imgSrc, 'auto', '100%', link)
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.item}>
        <label>Source</label>
        <div className={styles.control}>
          <input
            value={imgSrc}
            type="text"
            placeholder="file.go.gov.sg link"
            onChange={(e) => setImgSrc(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.item}>
        <label>Link to</label>
        <div className={styles.control}>
          <input
            value={link}
            type="text"
            placeholder="Image click links to this URL"
            onChange={(e) => setLink(e.target.value)}
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
  const { expanded, onExpandEvent, doCollapse } = props
  const { editorState, setEditorState } = useContext(EditorContext)

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

  function formatLink(link: string): string {
    if (VARIABLE_REGEX.test(link)) return link
    if (
      !link.startsWith('http://') &&
      !link.startsWith('https://') &&
      !link.startsWith('mailto:')
    ) {
      return `http://${link}`
    }

    return link
  }

  function addImage(
    src: string,
    height: string | number,
    width: string | number,
    link: string
  ): void {
    const entityData = { src, height, width, link: formatLink(link) }
    const entityKey = editorState
      .getCurrentContent()
      .createEntity('IMAGE', 'MUTABLE', entityData)
      .getLastCreatedEntityKey()
    const updated = AtomicBlockUtils.insertAtomicBlock(
      editorState,
      entityKey,
      ' '
    )

    setEditorState(updated)
    doCollapse()
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
      {expanded && <ImageForm onChange={addImage} />}
    </div>
  )
}
