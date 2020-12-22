import React, { useState, useEffect } from 'react'
import { Map } from 'immutable'
import cx from 'classnames'
import {
  EditorState,
  ContentState,
  ContentBlock,
  genKey,
  SelectionState,
} from 'draft-js'
import styles from './RichTextEditor.module.scss'

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

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setShowPopover(() => !showPopover)
  }

  function handleGridSelect(rows: number, cols: number) {
    if (editorState && onChange) {
      let currentContentState = editorState.getCurrentContent()

      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const tableCell = new ContentBlock({
            key: genKey(),
            type: 'table-cell',
            text: '',
            data: Map({ rows: rows + 1, cols: cols + 1, row, col }),
          })

          const blockMap = currentContentState
            .getBlockMap()
            .set(tableCell.getKey(), tableCell)
          currentContentState = currentContentState.merge({
            blockMap,
          }) as ContentState
        }
      }

      // Insert empty block after
      const emptyKey = genKey()
      const empty = new ContentBlock({
        key: emptyKey,
        type: 'unstyled',
        text: '',
      })
      const blockMap = currentContentState.getBlockMap().set(emptyKey, empty)
      currentContentState = currentContentState.merge({
        blockMap,
      }) as ContentState

      let updated = EditorState.push(
        editorState,
        currentContentState,
        'insert-fragment'
      )

      // Set cursor to the empty block
      const selection = SelectionState.createEmpty(emptyKey)
      updated = EditorState.forceSelection(updated, selection)

      onChange(updated)
    }

    hidePopover()
  }

  return (
    <div className={styles.tableControl}>
      <button className="rdw-option-wrapper" onClick={handleClick}>
        <i className="bx bx-table"></i>
      </button>
      {showPopover && (
        <TableSelector
          onGridSelect={handleGridSelect}
          initialGridSize={MIN_GRID_SIZE}
        />
      )}
    </div>
  )
}
