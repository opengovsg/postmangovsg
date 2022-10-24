import type { MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useState } from 'react'
import cx from 'classnames'
import {
  ContentBlock,
  ContentState,
  EditorState,
  genKey,
  Modifier,
} from 'draft-js'
import { Map } from 'immutable'

import styles from '../RichTextEditor.module.scss'

const MIN_GRID_SIZE = 5
const MAX_GRID_SIZE = 20

const TableSelector = ({
  initialGridSize,
  onGridSelect,
}: {
  initialGridSize: number
  onGridSelect: (row: number, col: number) => void
}) => {
  const [gridRows, setGridRows] = useState(initialGridSize)
  const [gridCols, setGridCols] = useState(initialGridSize)
  const [coordinates, setCoordinates] = useState({ row: 0, col: 0 })

  useEffect(() => {
    const { row, col } = coordinates
    setGridRows(Math.max(Math.min(row + 2, MAX_GRID_SIZE), initialGridSize))
    setGridCols(Math.max(Math.min(col + 2, MAX_GRID_SIZE), initialGridSize))
  }, [coordinates, initialGridSize])

  function renderRow(row: number) {
    return Array(gridCols)
      .fill('')
      .map((_, col) => (
        <td
          className={cx({
            [styles.active]: row <= coordinates.row && col <= coordinates.col,
          })}
          key={row * gridRows + col}
          onClick={() => onGridSelect(row, col)}
          onMouseOver={() => setCoordinates({ row, col })}
        ></td>
      ))
  }

  function renderGrid() {
    return (
      <div className={styles.tableSelector}>
        <table>
          <tbody>
            {Array(gridRows)
              .fill('')
              .map((_, i) => (
                <tr key={i}>{renderRow(i)}</tr>
              ))}
          </tbody>
        </table>
        <div className={styles.gridSize}>{`${coordinates.row + 1} X ${
          coordinates.col + 1
        }`}</div>
      </div>
    )
  }

  return <div>{renderGrid()}</div>
}

export const TableControl = ({
  editorState,
  onChange,
  modalHandler,
}: {
  editorState?: EditorState
  onChange?: (editorState: EditorState) => void
  modalHandler?: any
}) => {
  const [showPopover, setShowPopover] = useState(false)
  useEffect(() => {
    modalHandler.registerCallBack(hidePopover)
    return () => modalHandler.deregisterCallBack(hidePopover)
  }, [modalHandler])

  function hidePopover() {
    setShowPopover(false)
  }

  function handleClick(e: ReactMouseEvent<HTMLElement>) {
    e.stopPropagation()
    if (!isDisabled()) setShowPopover(() => !showPopover)
  }

  function handleGridSelect(rows: number, cols: number) {
    if (editorState && onChange) {
      let contentState = editorState.getCurrentContent()
      const selectionState = editorState.getSelection()

      // Clear off existing selection
      contentState = Modifier.removeRange(
        contentState,
        selectionState,
        'backward'
      )

      // Split existing block to create insertion point
      const targetSelection = contentState.getSelectionAfter()
      contentState = Modifier.splitBlock(contentState, targetSelection)

      // Set insertion target to unstyled block to standardize
      const insertionTarget = contentState.getSelectionAfter()
      contentState = Modifier.setBlockType(
        contentState,
        insertionTarget,
        'unstyled'
      )

      // Create array of table cell blocks
      const fragmentArray: ContentBlock[] = []
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const tableCell = new ContentBlock({
            key: genKey(),
            type: 'table-cell',
            text: '',
            data: Map({ rows: rows + 1, cols: cols + 1, row, col }),
          })

          fragmentArray.push(tableCell)
        }
      }

      // Create empty block to be placed after table
      const empty = new ContentBlock({
        key: genKey(),
        type: 'unstyled',
        text: '',
      })
      fragmentArray.push(empty)

      // Create block map to be inserted
      const fragment =
        ContentState.createFromBlockArray(fragmentArray).getBlockMap()

      // Replace existing selection with the fragment containing table cells and empty block
      contentState = Modifier.replaceWithFragment(
        contentState,
        insertionTarget,
        fragment
      )

      // Select the empty block after insertion
      contentState = contentState.merge({
        selectionBefore: selectionState,
        selectionAfter: contentState.getSelectionAfter().set('hasFocus', true),
      }) as ContentState

      const updated = EditorState.push(
        editorState,
        contentState,
        'insert-fragment'
      )

      onChange(updated)
    }

    hidePopover()
  }

  function isDisabled(): boolean {
    let disabled = false

    if (editorState) {
      const selection = editorState.getSelection()
      const anchorKey = selection.getAnchorKey()
      const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)

      const anchorType = anchor.getType()
      disabled =
        anchorType === 'table-cell' ||
        anchorType === 'unordered-list-item' ||
        anchorType === 'ordered-list-item'
    }

    return disabled
  }

  return (
    <div className={styles.tableControl}>
      <div
        className={cx('rdw-option-wrapper', {
          'rdw-option-disabled': isDisabled(),
        })}
        onClick={handleClick}
      >
        <i className="bx bx-table"></i>
      </div>
      {showPopover && (
        <TableSelector
          onGridSelect={handleGridSelect}
          initialGridSize={MIN_GRID_SIZE}
        />
      )}
    </div>
  )
}
