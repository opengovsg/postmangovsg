import React, { useContext } from 'react'
import { EditorContext } from './RichTextEditor'

export const TableWrapper = (props: any) => {
  const { editorState } = useContext(EditorContext)
  const { key } = props.children[0]
  const block = editorState.getCurrentContent().getBlockForKey(key)

  function renderTable() {
    const rows = block.getData().get('rows', 0)
    const cols = block.getData().get('cols', 0)

    const renderRow = (rowIdx: number) => {
      return Array(cols)
        .fill('')
        .map((_, col) => props.children[rowIdx * cols + col])
    }

    return (
      <table>
        <tbody>
          {Array(rows)
            .fill('')
            .map((_, row) => (
              <tr key={row}>{renderRow(row)}</tr>
            ))}
        </tbody>
      </table>
    )
  }

  // When the table is deleted, block will be null
  return block ? renderTable() : <></>
}
