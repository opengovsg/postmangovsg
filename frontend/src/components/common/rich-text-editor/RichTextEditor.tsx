import React, { useEffect, useState } from 'react'
import { EditorState, ContentState, convertToRaw } from 'draft-js'
import { Editor } from 'react-draft-wysiwyg'
import draftToHtml from 'draftjs-to-html'
import htmlToDraft from 'html-to-draftjs'

import { VariableDecorator } from './VariableDecorator'

import 'draft-js/dist/Draft.css'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import styles from './RichTextEditor.module.scss'

const TOOLBAR_OPTIONS = {
  options: ['inline', 'blockType', 'colorPicker', 'textAlign', 'list', 'image'],
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
  },
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: Function
  placeholder?: string
}) => {
  const [editorState, setEditorState] = useState(() => {
    if (value) return createEditorStateFromHTML(value)
    return EditorState.createEmpty()
  })

  useEffect(() => {
    // Normalise HTML whenever editor state is initialised or updated
    const currentContent = editorState.getCurrentContent()
    const html = draftToHtml(convertToRaw(currentContent))
    onChange(html)
  }, [editorState, onChange])

  function createEditorStateFromHTML(html: string) {
    const blocksFromHTML = htmlToDraft(html)
    const contentState = ContentState.createFromBlockArray(
      blocksFromHTML.contentBlocks,
      blocksFromHTML.entityMap
    )
    return EditorState.createWithContent(contentState)
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
      customDecorators={[VariableDecorator]}
    />
  )
}

export default RichTextEditor
