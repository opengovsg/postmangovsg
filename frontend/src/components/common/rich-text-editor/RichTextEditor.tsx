import React, { useContext, useEffect, useState } from 'react'
import {
  EditorState,
  ContentBlock,
  ContentState,
  convertToRaw,
  RawDraftEntity,
} from 'draft-js'
import { Editor } from 'react-draft-wysiwyg'
import draftToHtml from 'draftjs-to-html'
import htmlToDraft from 'html-to-draftjs'

import { VariableDecorator } from './VariableDecorator'
import { LinkDecorator } from './LinkDecorator'
import { LinkControl } from './LinkControl'
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
    const html = draftToHtml(convertToRaw(currentContent))
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
    const blocksFromHTML = htmlToDraft(html)
    const contentState = ContentState.createFromBlockArray(
      blocksFromHTML.contentBlocks,
      blocksFromHTML.entityMap
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
