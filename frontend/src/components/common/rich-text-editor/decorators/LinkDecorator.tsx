import cx from 'classnames'
import React, { useContext, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  ContentBlock,
  ContentState,
  DraftDecorator,
  SelectionState,
  RichUtils,
} from 'draft-js'

import { EditorContext } from '../RichTextEditor'

import styles from '../RichTextEditor.module.scss'

const linkStrategy = (
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void,
  contentState: ContentState
): void => {
  contentBlock.findEntityRanges((character) => {
    const entityKey = character.getEntity()
    return (
      entityKey !== null &&
      contentState.getEntity(entityKey).getType() === 'LINK'
    )
  }, callback)
}

const LinkSpan = (props: {
  blockKey: string
  children: React.ReactChildren
  entityKey: string
  contentState: ContentState
  start: number
  end: number
}) => {
  const { editorState, setEditorState } = useContext(EditorContext)
  const linkRef = useRef<HTMLSpanElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState({})
  const { blockKey, children, entityKey, contentState, start, end } = props
  const { url, targetOption } = contentState.getEntity(entityKey).getData()

  function openLink() {
    const linkTab = window.open(url, '_blank')
    if (linkTab) linkTab.focus()
    hidePopover()
  }

  function removeLink(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()

    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: start,
      focusOffset: end,
    })

    const updatedState = RichUtils.toggleLink(editorState, selection, null)
    setEditorState(updatedState)
  }

  function flipPopover() {
    if (linkRef.current && linkRef.current.parentElement) {
      const { offsetLeft, parentElement } = linkRef.current
      return offsetLeft / parentElement.offsetWidth > 0.7
    }
    return false
  }

  function hidePopover() {
    // Do not setState if link is already removed
    if (linkRef.current) setShowPopover(false)
    setPopoverStyle({})
  }

  function handleClick(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    if (!showPopover) {
      const linkElement: HTMLElement = event.currentTarget
      const dimensions = linkElement.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const style = {
        left: dimensions.left,
        top: dimensions.top + dimensions.height + scrollTop,
      }
      setPopoverStyle(style)
      setShowPopover(true)
      // Set listener only after event has completed bubbling to prevent the current event
      // from closing the popover.
      setTimeout(() => {
        window.addEventListener('click', hidePopover, {
          once: true,
        })
      })
    }
  }

  return (
    <span ref={linkRef} className={styles.link}>
      <span className={styles.title} onClick={(e) => handleClick(e)}>
        {children}
      </span>
      {showPopover &&
        ReactDOM.createPortal(
          <div
            contentEditable={false}
            style={popoverStyle}
            className={cx('popover', {
              right: flipPopover(),
            })}
          >
            <a href={url} onClick={openLink} target={targetOption}>
              <span>{url}</span>
              <i className="bx bx-link-external" />
            </a>
            <span className="divider"></span>
            <button onClick={removeLink}>Remove</button>
          </div>,
          document.body
        )}
    </span>
  )
}

const PreviewLinkSpan = ({
  children,
  contentState,
  entityKey,
}: {
  children: React.ReactChildren
  contentState: ContentState
  entityKey: string
}) => {
  const { url, targetOption } = contentState.getEntity(entityKey).getData()

  return (
    <span className={styles.link}>
      <a href={url} className={styles.title} target={targetOption}>
        {children}
      </a>
    </span>
  )
}

export const LinkDecorator: DraftDecorator = {
  strategy: linkStrategy,
  component: LinkSpan,
}

export const PreviewLinkDecorator: DraftDecorator = {
  strategy: linkStrategy,
  component: PreviewLinkSpan,
}
