import React, { useContext, useEffect, useState } from 'react'
import {
  EditorState,
  ContentBlock,
  ContentState,
  convertToRaw,
  RichUtils,
} from 'draft-js'
import { Editor } from 'react-draft-wysiwyg'

import {
  LinkControl,
  ImageControl,
  TableControl,
  ListControl,
  BlockTypeControl,
  TextAlignControl,
  InlineControl,
  FontColorControl,
} from './controls'
import { VariableDecorator, LinkDecorator } from './decorators'
import { Converter } from './utils'
import { ImageBlock } from './ImageBlock'

import 'draft-js/dist/Draft.css'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import styles from './RichTextEditor.module.scss'

const TOOLBAR_OPTIONS = {
  options: [
    'inline',
    'colorPicker',
    'blockType',
    'textAlign',
    'list',
    'link',
    'image',
  ],
  inline: {
    options: ['bold', 'italic', 'underline'],
    component: InlineControl,
  },
  blockType: {
    options: ['Normal', 'H1', 'H2', 'H4'],
    component: BlockTypeControl,
  },
  colorPicker: {
    component: FontColorControl,
    colors: [
      /* eslint-disable */
      'rgb(0,0,0)', 'rgb(100,112,125)', 'rgb(193,199,205)',
      'rgb(44,44,220)', 'rgb(0,124,143)', 'rgb(231,87,96)',
      'rgb(181,196,255)', 'rgb(179,216,221,1)', 'rgb(250,221,223,1)',
      'rgb(157,173,245)', 'rgb(128,190,199)', 'rgb(241,154,160)',
      'rgb(33,33,165)', 'rgb(0,99,114)', 'rgb(175,63,74)',
      'rgb(4,6,81)', 'rgb(0,74,86)', 'rgb(139,52,58)',
      /* eslint-enable */
    ],
  },
  textAlign: {
    component: TextAlignControl,
  },
  list: {
    component: ListControl,
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
