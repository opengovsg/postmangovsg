import { i18n } from '@lingui/core'

import cx from 'classnames'
import { AtomicBlockUtils } from 'draft-js'
import { debounce } from 'lodash'
import { useContext, useState, useMemo } from 'react'

import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'

import { OutboundLink } from 'react-ga'

import { EditorContext } from '../RichTextEditor'
import styles from '../RichTextEditor.module.scss'

import CloseButton from 'components/common/close-button'
import { LINKS } from 'config'

const VARIABLE_REGEX = new RegExp(/^{{\s*?\w+\s*?}}$/)

enum ImagePreviewState {
  Blank,
  Error,
  Loading,
  Success,
}

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
  const [previewState, setPreviewState] = useState(ImagePreviewState.Blank)
  const [showImgPreview, setShowImgPreview] = useState(false)

  // Debounced function that triggers an attempt to load image at imgSrc
  const loadImgPreview = useMemo(() => {
    setShowImgPreview(false)
    return debounce(() => setShowImgPreview(true), 900)
  }, [])

  function stopPropagation(e: ReactMouseEvent<HTMLElement>) {
    e.stopPropagation()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onChange(imgSrc, 'auto', '100%', link)
  }

  return (
    <form
      onClick={stopPropagation}
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.top}>
        <div>
          <p className={styles.header}>Insert image</p>
        </div>
        <CloseButton onClick={doCollapse} className={styles.closeButton} />
      </div>
      <div className={styles.item}>
        <label>Source</label>
        <div
          className={
            previewState === ImagePreviewState.Error
              ? cx(styles.control, styles.errorControl)
              : styles.control
          }
        >
          <input
            value={imgSrc}
            type="text"
            placeholder="https://file.go.gov.sg/image"
            onChange={(e) => {
              setImgSrc(e.target.value)
              setPreviewState(ImagePreviewState.Loading)
              loadImgPreview()
            }}
            onBlur={() => {
              if (previewState === ImagePreviewState.Loading) {
                // Cancel debounce and manually try loading the image preview
                loadImgPreview.cancel()
                setShowImgPreview(true)
              }
            }}
          />
        </div>
      </div>

      {previewState === ImagePreviewState.Error && (
        <div className={styles.controlErrorMsg}>
          Image not found at this address
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

      {previewState === ImagePreviewState.Loading && (
        <div className={styles.loadingIcon}>
          <i className="bx bx-loader-alt bx-spin"></i>
        </div>
      )}

      {showImgPreview && (
        // This img tag is used to check if imgSrc is a valid image URI
        // onLoad/onError will be triggered depending on the outcome
        <div
          style={{
            // Hide the image if it is still loading
            display:
              previewState === ImagePreviewState.Success ? 'block' : 'none',
          }}
          className={styles.imagePreview}
        >
          <img
            src={imgSrc}
            onLoad={() => setPreviewState(ImagePreviewState.Success)}
            onError={() => {
              setShowImgPreview(false)
              loadImgPreview.cancel()

              if (imgSrc === '') setPreviewState(ImagePreviewState.Blank)
              else setPreviewState(ImagePreviewState.Error)
            }}
          ></img>
        </div>
      )}

      <div className={styles.submit}>
        <OutboundLink
          className={styles.guideLink}
          eventLabel={i18n._(LINKS.guideEmailImageUrl)}
          to={i18n._(LINKS.guideEmailImageUrl)}
          target="_blank"
        >
          View guide <i className="bx bx-link-external"></i>
        </OutboundLink>
        <button type="submit" disabled={!imgSrc}>
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
