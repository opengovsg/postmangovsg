import React, { useRef, useState, useContext } from 'react'
import {
  ContentBlock,
  ContentState,
  EditorState,
  SelectionState,
  Modifier,
} from 'draft-js'

import { EditorContext } from '../RichTextEditor'

export const ImageBlock = ({
  block,
  contentState,
  blockProps,
}: {
  block: ContentBlock
  contentState: ContentState
  blockProps: any
}) => {
  const { editorState, setEditorState } = useContext(EditorContext)
  const readOnly = blockProps?.readOnly
  const imageRef = useRef<HTMLImageElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const entity = contentState.getEntity(block.getEntityAt(0))
  const { src, width, height, link } = entity.getData()

  function hidePopover() {
    // Do not setState if link is already removed
    if (imageRef.current) setShowPopover(false)
  }

  function handleClick() {
    if (!showPopover) {
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

  async function handleRemove() {
    const blockKey = block.getKey()

    // Clear off the entire image block content (usually empty space)
    const rangeToRemove = SelectionState.createEmpty(blockKey).merge({
      anchorKey: blockKey,
      focusKey: blockKey,
      anchorOffset: 0,
      focusOffset: block.getLength(),
    })
    let updatedContentState = Modifier.removeRange(
      contentState,
      rangeToRemove,
      'forward'
    )

    // Delete atomic block from block map
    const blockMap = updatedContentState.getBlockMap().delete(block.getKey())

    // Update selection to next block after deleting current block
    const selectionAfter = SelectionState.createEmpty(
      contentState.getBlockAfter(blockKey).getKey()
    )

    updatedContentState = updatedContentState.merge({
      blockMap,
      selectionAfter,
    }) as ContentState

    // Push updated state to allow for undos
    const updated = EditorState.push(
      editorState,
      updatedContentState,
      'remove-range'
    )

    setEditorState(updated)
  }

  function getUpdateWidth(width: number) {
    return () => {
      // Preserve selection to prevent jumping to start of editor after setting width
      const currentSelection = editorState.getSelection()
      const entityKey = block.getEntityAt(0)
      contentState.mergeEntityData(entityKey, {
        width: `${width}%`,
      })
      const updated = EditorState.push(
        EditorState.forceSelection(editorState, currentSelection),
        contentState,
        'change-block-data'
      )
      setEditorState(updated)
    }
  }

  return readOnly ? (
    <img ref={imageRef} src={src} width={width} height={height} alt="" />
  ) : (
    <span>
      <img
        ref={imageRef}
        onClick={handleClick}
        src={src}
        width={width}
        height={height}
        alt=""
      />
      {showPopover && (
        <div contentEditable={false} className="popover">
          <button onClick={getUpdateWidth(50)}>50%</button>
          <span className="divider"></span>
          <button onClick={getUpdateWidth(75)}>75%</button>
          <span className="divider"></span>
          <button onClick={getUpdateWidth(100)}>100%</button>
          <span className="divider"></span>
          <button onClick={handleRemove}>Remove</button>
          {link && (
            <>
              <span className="divider"></span>
              <a href={link} target="_blank" rel="noopener noreferrer">
                Link <i className="bx bx-link"></i>
              </a>
            </>
          )}
        </div>
      )}
    </span>
  )
}
