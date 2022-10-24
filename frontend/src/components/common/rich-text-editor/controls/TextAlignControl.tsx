import { useContext } from 'react'
import cx from 'classnames'

import { EditorContext } from '../RichTextEditor'

interface TextAlignControlProps {
  config: any
  currentState: any
  expanded: boolean
  onChange: (alignment: string) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const TextAlignOptions = ({
  options,
  onChange,
}: {
  options: string[]
  onChange: (alignment: string) => void
}) => {
  return (
    <ul className="rdw-dropdown-optionwrapper">
      {options.map((alignment, i) => (
        <li
          key={i}
          className="rdw-dropdownoption-default"
          onClick={() => onChange(alignment)}
        >
          <i
            className={`bx bx-align-${
              alignment === 'center' ? 'middle' : alignment
            }`}
          ></i>
        </li>
      ))}
    </ul>
  )
}

export const TextAlignControl = (props: TextAlignControlProps) => {
  const { currentState, config, expanded, onExpandEvent, onChange } = props
  const { options } = config
  const { textAlignment } = currentState
  const { editorState } = useContext(EditorContext)

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
        <i
          className={`bx bx-align-${
            textAlignment === 'center' ? 'middle' : textAlignment || 'left'
          }`}
        ></i>
        <div
          className={cx({
            'rdw-dropdown-carettoclose': expanded,
            'rdw-dropdown-carettoopen': !expanded,
          })}
        ></div>
      </div>
      {expanded && <TextAlignOptions options={options} onChange={onChange} />}
    </div>
  )
}
