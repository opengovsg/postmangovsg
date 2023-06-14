import { EditorState, Modifier, SelectionState } from 'draft-js'
import { useContext, useState } from 'react'

import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'

import Dropzone from 'react-dropzone'

import { EditorContext } from '../RichTextEditor'
import styles from '../RichTextEditor.module.scss'

import CloseButton from 'components/common/close-button'
import { uploadCommonCampaignAttachment } from 'services/attachment.service'

const InlineAttachmentForm = ({
  onChange,
  doCollapse,
}: {
  onChange: (key: string, ...vals: string[]) => void
  doCollapse: () => void
}) => {
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function stopPropagation(e: ReactMouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  async function handleDrop(files: Array<File>) {
    setIsLoading(true)
    if (!files || files.length === 0) return
    try {
      setLink(await uploadCommonCampaignAttachment(files[0]))
      setText(files[0].name)
    } catch (e) {
      setError(
        'Failed to upload attachment. Please check file size to be < 50MB'
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onChange(link, text)
  }
  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.top}>
        <div>
          <p className={styles.header}>Embed attachment</p>
        </div>
        <CloseButton onClick={doCollapse} className={styles.closeButton} />
      </div>
      {!isLoading && !link && (
        <div className={styles.item}>
          <Dropzone
            maxFiles={1}
            maxSize={50 * 1024 * 1024}
            onError={(e: Error) => setError(e.message)}
            onDropAccepted={handleDrop}
          >
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps({ className: styles.dropzone })}>
                <input {...getInputProps()} />
                <p>Drag and drop a file here, or click to select</p>
              </div>
            )}
          </Dropzone>
        </div>
      )}
      {isLoading && (
        <div className={styles.loadingIcon}>
          <i className="bx bx-loader-alt bx-spin"></i>
        </div>
      )}
      {link && (
        <a href={link} target="_blank" rel="noreferrer">
          {text}
        </a>
      )}

      {link && (
        <div className={styles.item}>
          <label>Link text</label>
          <div className={styles.control}>
            <input
              value={text}
              type="text"
              placeholder="Display text for the attachment hyperlink"
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
      )}

      {error && <div className={styles.controlErrorMsg}>{error}</div>}

      <div className={styles.submit}>
        <button type="submit" disabled={isLoading || !link || !text}>
          Insert
        </button>
      </div>
    </form>
  )
}

export const InlineAttachmentControl = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { editorState, setEditorState } = useContext(EditorContext)

  function toggleIsExpanded(forcedValue?: boolean) {
    if (forcedValue !== undefined) {
      setIsExpanded(forcedValue)
      return
    }
    setIsExpanded(!isExpanded)
  }

  function addAttachment(link: string, text: string): void {
    const contentState = editorState.getCurrentContent()
    const selection = editorState.getSelection()
    // create new content with text
    const newContent = Modifier.insertText(contentState, selection, text)
    // create new link entity
    const newContentWithEntity = newContent.createEntity('LINK', 'MUTABLE', {
      url: link,
      targetOption: '_blank',
    })
    const entityKey = newContentWithEntity.getLastCreatedEntityKey()
    // create new selection with the inserted text
    const anchorOffset = selection.getAnchorOffset()
    const newSelection = new SelectionState({
      anchorKey: selection.getAnchorKey(),
      anchorOffset,
      focusKey: selection.getAnchorKey(),
      focusOffset: anchorOffset + text.length,
    })
    // and aply link entity to the inserted text
    const newContentWithLink = Modifier.applyEntity(
      newContentWithEntity,
      newSelection,
      entityKey
    )
    // create new state with link text
    const withLinkText = EditorState.push(
      editorState,
      newContentWithLink,
      'insert-characters'
    )
    // now lets add cursor right after the inserted link
    const withProperCursor = EditorState.forceSelection(
      withLinkText,
      newContent.getSelectionAfter()
    )
    // update the editor with all changes
    setEditorState(withProperCursor)

    toggleIsExpanded(false)
  }

  return (
    <div className={styles.imageControl}>
      <div onClick={() => toggleIsExpanded()} className={'rdw-option-wrapper'}>
        <i className="bx bx-paperclip"></i>
      </div>
      {isExpanded && (
        <InlineAttachmentForm
          onChange={addAttachment}
          doCollapse={() => toggleIsExpanded(false)}
        />
      )}
    </div>
  )
}
