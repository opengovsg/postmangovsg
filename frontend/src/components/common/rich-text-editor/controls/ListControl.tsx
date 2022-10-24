import { useContext } from 'react'
import cx from 'classnames'

import { EditorContext } from '../RichTextEditor'

interface ListControlProps {
  config: any
  currentState: any
  expanded: boolean
  onChange: (type: string) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const ListOptions = ({ onChange }: { onChange: (type: string) => void }) => {
  function toggleListType(listType: string) {
    onChange(listType)
  }

  return (
    <ul className="rdw-dropdown-optionwrapper">
      <li
        onClick={() => toggleListType('unordered')}
        className="rdw-dropdownoption-default"
      >
        <i className="bx bx-list-ul"></i>
      </li>
      <li
        onClick={() => toggleListType('ordered')}
        className="rdw-dropdownoption-default"
      >
        <i className="bx bx-list-ol"></i>
      </li>
    </ul>
  )
}

export const ListControl = (props: ListControlProps) => {
  const { currentState, expanded, onExpandEvent, onChange } = props
  const { listType } = currentState
  const { editorState } = useContext(EditorContext)

  function isDisabled(): boolean {
    const selection = editorState.getSelection()
    const anchorKey = selection.getAnchorKey()
    const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)
    return anchor.getType() === 'table-cell'
  }

  function showOptions() {
    if (!isDisabled()) onExpandEvent()
  }

  return (
    <div
      className={cx('rdw-dropdown-wrapper', 'rdw-list-dropdown', {
        'rdw-option-disabled': isDisabled(),
      })}
    >
      <div onClick={showOptions} className="rdw-dropdown-selectedtext">
        <i className={`bx bx-list-${listType === 'ordered' ? 'ol' : 'ul'}`}></i>
        <div
          className={cx({
            'rdw-dropdown-carettoclose': expanded,
            'rdw-dropdown-carettoopen': !expanded,
          })}
        ></div>
      </div>
      {expanded && <ListOptions onChange={onChange} />}
    </div>
  )
}
