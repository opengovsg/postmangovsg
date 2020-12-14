import React, { useRef, useState, useContext } from 'react'
import {
  CharacterMetadata,
  ContentBlock,
  ContentState,
  EditorState,
  SelectionState,
  Modifier,
} from 'draft-js'

import { EditorContext } from './RichTextEditor'
import styles from './RichTextEditor.module.scss'

export const ImageBlock = ({
  block,
  contentState,
}: {
  block: ContentBlock
  contentState: ContentState
}) => {
  const { editorState, setEditorState } = useContext(EditorContext)
  const imageRef = useRef<HTMLImageElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const entity = contentState.getEntity(block.getEntityAt(0))
  const { src, width, height } = entity.getData()

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

    // Determine and select the range for image
    const { start, end } = await new Promise((resolve) => {
      block.findEntityRanges(
        (value: CharacterMetadata) => {
          const entityKey = value.getEntity()
          return (
            entityKey !== null &&
            contentState.getEntity(entityKey).getType() === 'IMAGE'
          )
        },
        (start: number, end: number) => resolve({ start, end })
      )
    })
    const rangeToRemove = SelectionState.createEmpty(blockKey).merge({
      anchorKey: blockKey,
      focusKey: blockKey,
      anchorOffset: start,
      focusOffset: end,
    })

    // Remove image
    let updatedContentState = Modifier.removeRange(
      contentState,
      rangeToRemove,
      'forward'
    )

    // If the content block is empty after removing image, we also remove the block
    const blockLength = updatedContentState.getBlockForKey(blockKey).getLength()
    if (blockLength < 1) {
      // Update selection to next block after deleting current block
      const selectionAfter = SelectionState.createEmpty(
        contentState.getBlockAfter(blockKey).getKey()
      )
      // Delete content block from block map
      const blockMap = updatedContentState.getBlockMap().delete(block.getKey())
      updatedContentState = updatedContentState.merge({
        blockMap,
        selectionAfter,
      }) as ContentState
    }

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

  return (
    <span>
      <img
        ref={imageRef}
        onClick={handleClick}
        src={src}
        width={width}
        height={height}
      />
      {showPopover && (
        <div contentEditable={false} className={styles.popover}>
          <button onClick={getUpdateWidth(50)}>50%</button>
          <span className={styles.divider}></span>
          <button onClick={getUpdateWidth(75)}>75%</button>
          <span className={styles.divider}></span>
          <button onClick={getUpdateWidth(100)}>100%</button>
          <span className={styles.divider}></span>
          <button onClick={handleRemove}>Remove</button>
        </div>
      )}
    </span>
  )
}
