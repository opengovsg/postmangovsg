import { i18n } from '@lingui/core'

import cx from 'classnames'
import { AtomicBlockUtils } from 'draft-js'
import { debounce } from 'lodash'
import { useContext, useState, useMemo, useCallback } from 'react'

import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'

import { OutboundLink } from 'react-ga'

import { EditorContext } from '../RichTextEditor'
import styles from '../RichTextEditor.module.scss'

import CloseButton from 'components/common/close-button'
import Tooltip from 'components/common/tooltip'
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

/**
 * Checks if an img src value is valid by creating a non-mounted image element
 * @param imgSrc
 * @returns whether imgSrc is valid
 */
const isImgSrcValid = (imgSrc: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    img.onerror = () => resolve(false)
    img.onload = () => resolve(true)
    img.src = imgSrc
  })
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

  const updatePreviewState = useCallback(async (imgSrc: string) => {
    if (imgSrc === '') {
      setPreviewState(ImagePreviewState.Blank)
    } else if (await isImgSrcValid(imgSrc)) {
      setPreviewState(ImagePreviewState.Success)
    } else {
      setPreviewState(ImagePreviewState.Error)
    }
  }, [])

  const debouncedUpdatePreviewState = useMemo(
    () => debounce(updatePreviewState, 900),
    [updatePreviewState]
  )

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
          <p className={styles.header}>
            Insert image
            <Tooltip
              containerClassName={styles.infoIcon}
              text="Upload your image to go.gov.sg and copy the file.go.gov.sg link"
            >
              <i className="bx bxs-help-circle"></i>
            </Tooltip>
          </p>
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
              debouncedUpdatePreviewState(e.target.value)
            }}
            onBlur={async (e) => {
              // If updatePreviewState is queued (due to debounce), cancel and immediately run validation
              if (previewState === ImagePreviewState.Loading) {
                debouncedUpdatePreviewState.cancel()
                await updatePreviewState(e.target.value)
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

      {previewState === ImagePreviewState.Success && (
        <div className={styles.imagePreview}>
          <img src={imgSrc}></img>
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
        <button
          type="submit"
          disabled={previewState !== ImagePreviewState.Success}
        >
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
