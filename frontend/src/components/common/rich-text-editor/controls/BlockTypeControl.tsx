import { useContext } from 'react'
import cx from 'classnames'

import { EditorContext } from '../RichTextEditor'

const BLOCK_TYPE_DESCRIPTION: Record<string, string> = {
  unstyled: 'Normal',
  'header-one': 'Title',
  'header-two': 'Subtitle',
  'header-four': 'Header',
}

const TAG_DESCRIPTION: Record<string, string> = {
  H1: 'Title',
  H2: 'Subtitle',
  H4: 'Header',
}

interface BlockTypeControlProps {
  config: any
  currentState: any
  expanded: boolean
  onChange: (type: string) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const BlockOptions = ({
  options,
  onChange,
}: {
  options: string[]
  onChange: (type: string) => void
}) => {
  return (
    <ul className="rdw-dropdown-optionwrapper">
      {options.map((blockType, i) => (
        <li
          key={i}
          className={cx('rdw-dropdownoption-default', blockType.toLowerCase())}
          onClick={() => onChange(blockType)}
        >
          {TAG_DESCRIPTION[blockType] || 'Normal'}
        </li>
      ))}
    </ul>
  )
}

export const BlockTypeControl = (props: BlockTypeControlProps) => {
  const { config, expanded, onExpandEvent, onChange } = props
  const { options } = config
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

  function getActiveBlockType(): string {
    const selection = editorState.getSelection()
    const anchorKey = selection.getAnchorKey()
    const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)

    return BLOCK_TYPE_DESCRIPTION[anchor.getType()] || 'Normal'
  }

  return (
    <div
      className={cx('rdw-dropdown-wrapper', 'rdw-block-dropdown', {
        'rdw-option-disabled': isDisabled(),
      })}
    >
      <div onClick={showOptions} className="rdw-dropdown-selectedtext">
        <span>{getActiveBlockType()}</span>
        <div
          className={cx({
            'rdw-dropdown-carettoclose': expanded,
            'rdw-dropdown-carettoopen': !expanded,
          })}
        ></div>
      </div>
      {expanded && <BlockOptions options={options} onChange={onChange} />}
    </div>
  )
}
