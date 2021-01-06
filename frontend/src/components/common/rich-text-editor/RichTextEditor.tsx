import React, { useContext, useEffect, useState } from 'react'
import {
  EditorState,
  ContentBlock,
  ContentState,
  convertToRaw,
  RawDraftEntity,
  RichUtils,
} from 'draft-js'
import { Editor } from 'react-draft-wysiwyg'

import { VariableDecorator } from './VariableDecorator'
import { LinkDecorator } from './LinkDecorator'
import { LinkControl } from './LinkControl'
import { Converter } from './utils'
import { ImageBlock } from './ImageBlock'
import { ImageControl } from './ImageControl'

import 'draft-js/dist/Draft.css'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import styles from './RichTextEditor.module.scss'

const TOOLBAR_OPTIONS = {
  options: [
    'inline',
    'blockType',
    'colorPicker',
    'textAlign',
    'list',
    'image',
    'link',
  ],
  inline: {
    options: ['bold', 'italic', 'underline'],
  },
  blockType: {
    options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
  },
  textAlign: {
    inDropdown: true,
  },
  list: {
    inDropdown: true,
  },
  image: {
    uploadEnabled: false,
    component: ImageControl,
  },
  link: {
    defaultTargetOption: '_blank',
    showOpenOptionOnHover: false,
    component: LinkControl,
  },
}

const defaultValue = {
  editorState: EditorState.createEmpty(),
  setEditorState: {} as React.Dispatch<React.SetStateAction<EditorState>>,
}
export const EditorContext = React.createContext(defaultValue)

const RichTextEditor = ({
  onChange,
  placeholder,
}: {
  onChange: Function
  placeholder?: string
}) => {
  const { editorState, setEditorState } = useContext(EditorContext)

  useEffect(() => {
    // Normalise HTML whenever editor state is initialised or updated
    const currentContent = editorState.getCurrentContent()
    const html = Converter.convertToHTML(convertToRaw(currentContent))
    onChange(html)
  }, [editorState, onChange])

  function renderBlock(block: ContentBlock): any | void {
    if (block.getType() === 'atomic') {
      const contentState = editorState.getCurrentContent()
      const entityKey = block.getEntityAt(0)

      if (entityKey) {
        const entity = contentState.getEntity(entityKey)
        if (entity?.getType() === 'IMAGE') {
          return {
            component: ImageBlock,
            editable: false,
          }
        }
      }
    }
  }

  function handleKeyCommand(command: string): 'handled' | 'not-handled' {
    if (command === 'backspace') {
      const selection = editorState.getSelection()
      const anchorKey = selection.getAnchorKey()
      const anchor = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getAnchorKey())

      const focusKey = selection.getFocusKey()
      const focus = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getFocusKey())

      // Prevent delete when selection is within a single emtpy cell
      if (
        anchorKey === focusKey &&
        anchor.getType() === 'table-cell' &&
        anchor.getText() === ''
      ) {
        return 'handled'
      }

      // TODO: Handle clearing text by selecting multiple cells

      // Prevent deleting subset of table cells. In order to delete entire table, user must select
      // outside of table.
      if (
        anchorKey !== focusKey &&
        (anchor.getType() === 'table-cell' || focus.getType() === 'table-cell')
      ) {
        return 'handled'
      }
    }

    // Manually handle inline edit commands since we are overwriting handleKeyCommand
    if (TOOLBAR_OPTIONS.inline.options.indexOf(command) >= 0) {
      const updated: null | EditorState = RichUtils.handleKeyCommand(
        editorState,
        command
      )
      if (updated) setEditorState(updated)
      return 'handled'
    }

    return 'not-handled'
  }

  function handleReturn(
    _e: React.KeyboardEvent,
    state: EditorState
  ): 'handled' | 'not-handled' {
    const selection = state.getSelection()
    const blockKey = selection.getAnchorKey()
    const block = state.getCurrentContent().getBlockForKey(blockKey)

    // Prevent splitting block by hitting return key
    if (block.getType() === 'table-cell') {
      // If selection is collapsed, we insert a line break
      if (selection.isCollapsed()) {
        setEditorState(RichUtils.insertSoftNewline(state))
      }
      return 'handled'
    }

    return 'not-handled'
  }

  return (
    <Editor
      wrapperClassName={styles.wrapper}
      toolbarClassName={styles.toolbar}
      editorClassName={styles.editor}
      placeholder={placeholder}
      editorState={editorState}
      onEditorStateChange={setEditorState}
      toolbar={TOOLBAR_OPTIONS}
      customDecorators={[VariableDecorator, LinkDecorator]}
      customBlockRenderFunc={renderBlock}
      handleKeyCommand={handleKeyCommand}
      handleReturn={handleReturn}
    />
  )
}

const WrappedRichTextEditor = (props: any) => {
  const { value } = props
  const [editorState, setEditorState] = useState(() => {
    if (value) return createEditorStateFromHTML(value)
    return EditorState.createEmpty()
  })

  function createEditorStateFromHTML(html: string) {
    const { contentBlocks, entityMap } = Converter.convertFromHTML(html)
    const contentState = ContentState.createFromBlockArray(
      contentBlocks,
      entityMap
    )
    return EditorState.createWithContent(contentState)
  }

  return (
    <EditorContext.Provider value={{ editorState, setEditorState }}>
      <RichTextEditor {...props} />
    </EditorContext.Provider>
  )
}

export default WrappedRichTextEditor
