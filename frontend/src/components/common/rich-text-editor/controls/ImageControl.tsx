import cx from 'classnames'
import { AtomicBlockUtils } from 'draft-js'
import { useContext, useState } from 'react'

import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'

import Dropzone from 'react-dropzone'

import { EditorContext } from '../RichTextEditor'
import styles from '../RichTextEditor.module.scss'

import CloseButton from 'components/common/close-button'
import { uploadCommonCampaignAttachment } from 'services/attachment.service'

const VARIABLE_REGEX = new RegExp(/^{{\s*?\w+\s*?}}$/)

interface ImageControlProps {
  currentState: any
  expanded: boolean
  onChange: (key: string, ...vals: string[]) => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const ImageForm = ({
  onChange,
  doCollapse,
}: {
  onChange: (key: string, ...vals: string[]) => void
  doCollapse: () => void
}) => {
  const [imgSrc, setImgSrc] = useState('')
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
      setImgSrc(await uploadCommonCampaignAttachment(files[0]))
    } catch (e) {
      setError('Failed to upload image. Please check file size to be < 50MB')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onChange(imgSrc, 'auto', '50%', link)
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.top}>
        <div>
          <p className={styles.header}>Embed image</p>
        </div>
        <CloseButton onClick={doCollapse} className={styles.closeButton} />
      </div>
      {!isLoading && !imgSrc && (
        <div className={styles.item}>
          <Dropzone
            accept={{ 'image/*': [] }}
            maxFiles={1}
            maxSize={50 * 1024 * 1024}
            onError={(e: Error) => setError(e.message)}
            onDropAccepted={handleDrop}
          >
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps({ className: styles.dropzone })}>
                <input {...getInputProps()} />
                <p>Drag and drop an image here, or click to select</p>
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
      {imgSrc && (
        <div className={styles.imagePreview}>
          <img src={imgSrc} alt="Image embed preview" />
        </div>
      )}

      <div className={styles.item}>
        <label>Link to</label>
        <div className={styles.control}>
          <input
            value={link}
            type="text"
            placeholder="(Optional) Image click links to this URL"
            onChange={(e) => setLink(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.controlErrorMsg}>{error}</div>}

      <div className={styles.submit}>
        <button type="submit" disabled={isLoading || !imgSrc}>
          Insert
        </button>
      </div>
    </form>
  )
}

export const ImageControl = (props: ImageControlProps) => {
  const { expanded, onExpandEvent, doCollapse } = props
  const { editorState, setEditorState } = useContext(EditorContext)

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

  function showPopover() {
    if (!isDisabled()) onExpandEvent()
  }

  function formatLink(link: string): string {
    if (VARIABLE_REGEX.test(link)) return link
    if (
      link &&
      !link.startsWith('http://') &&
      !link.startsWith('https://') &&
      !link.startsWith('mailto:')
    ) {
      return `http://${link}`
    }

    return link
  }

  function addImage(
    src: string,
    height: string | number,
    width: string | number,
    link: string
  ): void {
    const entityData = { src, height, width, link: formatLink(link) }
    const entityKey = editorState
      .getCurrentContent()
      .createEntity('IMAGE', 'MUTABLE', entityData)
      .getLastCreatedEntityKey()
    const updated = AtomicBlockUtils.insertAtomicBlock(
      editorState,
      entityKey,
      ' '
    )

    setEditorState(updated)
    doCollapse()
  }

  return (
    <div className={styles.imageControl}>
      <div
        onClick={showPopover}
        className={cx('rdw-option-wrapper', {
          'rdw-option-disabled': isDisabled(),
        })}
      >
        <i className="bx bx-image"></i>
      </div>
      {expanded && <ImageForm onChange={addImage} doCollapse={doCollapse} />}
    </div>
  )
}
