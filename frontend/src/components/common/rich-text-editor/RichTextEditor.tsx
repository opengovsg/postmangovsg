import cx from 'classnames'
import React, { useContext, useEffect, useState } from 'react'
import Immutable from 'immutable'
import {
  EditorState,
  ContentBlock,
  ContentState,
  convertToRaw,
  DefaultDraftBlockRenderMap,
  RichUtils,
  Modifier,
  SelectionState,
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
import {
  VariableDecorator,
  LinkDecorator,
  PreviewLinkDecorator,
} from './decorators'
import { Converter } from './utils'
import { ImageBlock, TableWrapper } from './blocks'

import 'draft-js/dist/Draft.css'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import styles from './RichTextEditor.module.scss'

const ExtendedEditor = (props: any) => <Editor {...props} />

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
      'rgb(0,0,0)',
      'rgb(100,112,125)',
      'rgb(193,199,205)',
      'rgb(44,44,220)',
      'rgb(0,124,143)',
      'rgb(231,87,96)',
      'rgb(33,33,165)',
      'rgb(0,99,114)',
      'rgb(175,63,74)',
      'rgb(4,6,81)',
      'rgb(0,74,86)',
      'rgb(139,52,58)',
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

const TOOLBAR_CUSTOM_BUTTONS = [<TableControl key="tableOption" />]

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
  const blockRenderMap = Immutable.Map({
    'table-cell': {
      element: 'td',
      wrapper: <TableWrapper />,
    },
  })
  const extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(
    blockRenderMap
  )

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
      const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)

      const focusKey = selection.getFocusKey()
      const focus = editorState.getCurrentContent().getBlockForKey(focusKey)

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

      // Prevent clearing line after table to ensure that table can be deleted by selecting line before or after table.
      const blockBefore = editorState
        .getCurrentContent()
        .getBlockBefore(anchorKey)
      if (
        anchorKey === focusKey &&
        selection.getAnchorOffset() === 0 &&
        blockBefore?.getType() === 'table-cell'
      ) {
        return 'handled'
      }
    }

    if (command === 'delete') {
      // Prevent clearing line before table to ensure that table can be deleted by selecting line before and after table.
      const selection = editorState.getSelection()
      const anchorKey = selection.getAnchorKey()
      const anchor = editorState.getCurrentContent().getBlockForKey(anchorKey)
      const blockAfter = editorState
        .getCurrentContent()
        .getBlockAfter(anchorKey)

      if (
        anchor?.getType() === 'table-cell' ||
        blockAfter?.getType() === 'table-cell'
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

  function handlePastedText(
    text: string,
    _html: string,
    editorState: EditorState
  ): boolean {
    let contentState = editorState.getCurrentContent()
    let selection = editorState.getSelection()
    const anchorKey = selection.getAnchorKey()
    const focusKey = selection.getFocusKey()
    const currentBlock = contentState.getBlockForKey(anchorKey)

    // Handle paste within table cells. We only paste as plain text and strip all HTML.
    if (currentBlock.getType() === 'table-cell') {
      // If user tries to select across multiple cells/blocks, we will replace the selection to just
      // the whole of the anchor block.
      if (anchorKey !== focusKey) {
        selection = SelectionState.createEmpty(anchorKey).merge({
          focusKey: anchorKey,
          anchorOffset: selection.getAnchorOffset(),
          focusOffset: currentBlock.getLength(),
        })
      }

      if (selection.isCollapsed()) {
        contentState = Modifier.insertText(contentState, selection, text)
      } else {
        contentState = Modifier.replaceText(contentState, selection, text)
      }

      const updated = EditorState.push(
        editorState,
        contentState,
        'insert-characters'
      )
      setEditorState(updated)
      return true
    }

    // Return false so that default behaviour will run
    return false
  }

  return (
    <ExtendedEditor
      wrapperClassName={styles.wrapper}
      toolbarClassName={styles.toolbar}
      editorClassName={styles.editor}
      placeholder={placeholder}
      editorState={editorState}
      onEditorStateChange={setEditorState}
      toolbar={TOOLBAR_OPTIONS}
      toolbarCustomButtons={TOOLBAR_CUSTOM_BUTTONS}
      customDecorators={[VariableDecorator, LinkDecorator]}
      customBlockRenderFunc={renderBlock}
      blockRenderMap={extendedBlockRenderMap}
      handleKeyCommand={handleKeyCommand}
      handleReturn={handleReturn}
      handlePastedText={handlePastedText}
      stripPastedStyles
    />
  )
}

const RichTextPreview = ({ placeholder }: { placeholder: string }) => {
  const { editorState, setEditorState } = useContext(EditorContext)

  const blockRenderMap = Immutable.Map({
    'table-cell': {
      element: 'td',
      wrapper: <TableWrapper />,
    },
  })
  const extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(
    blockRenderMap
  )

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
            props: {
              readOnly: true,
            },
          }
        }
      }
    }
  }

  return (
    <ExtendedEditor
      wrapperClassName={cx(styles.wrapper, styles.preview)}
      editorClassName={cx(styles.editor, styles.preview)}
      placeholder={placeholder}
      editorState={editorState}
      onEditorStateChange={setEditorState}
      customBlockRenderFunc={renderBlock}
      blockRenderMap={extendedBlockRenderMap}
      customDecorators={[PreviewLinkDecorator]}
      readOnly
      toolbarHidden
    />
  )
}

const WrappedRichTextEditor = (props: any) => {
  const { value, preview } = props
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
      {!preview ? (
        <RichTextEditor {...props} />
      ) : (
        <RichTextPreview {...props} />
      )}
    </EditorContext.Provider>
  )
}

export default WrappedRichTextEditor
