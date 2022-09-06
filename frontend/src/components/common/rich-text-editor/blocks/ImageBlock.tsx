import cx from 'classnames'
import {
  ContentBlock,
  ContentState,
  EditorState,
  SelectionState,
  Modifier,
} from 'draft-js'
import {
  useRef,
  useState,
  useContext,
  useEffect,
  useMemo,
  forwardRef,
} from 'react'

import { EditorContext } from '../RichTextEditor'
import { isImgSrcValid, isExternalImage } from '../utils/image'

import styles from './ImageBlock.module.scss'

interface ImageWithFallbackProps {
  onClick: () => void
  src: string
  width: number
  height: number
}

const ImageWithFallback = forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  ({ onClick, src, width, height }, ref) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [valid, setValid] = useState<boolean>(false)
    const isExternal = useMemo(() => isExternalImage(src), [src])

    const truncatedSrc = src.substring(0, 64) + (src.length > 64 ? '...' : '')

    useEffect(() => {
      const verifyImage = async () => {
        try {
          setLoading(true)
          const valid = await isImgSrcValid(src)
          setValid(valid)
        } catch (err) {
          setValid(false)
        } finally {
          setLoading(false)
        }
      }
      if (!isExternal) void verifyImage()
    }, [src, isExternal])

    if (loading) {
      return (
        <div className={styles.loading}>
          <i className="bx bx-loader-alt bx-spin"></i>
          <span>Loading image...</span>
        </div>
      )
    }

    if (isExternal) {
      return (
        <div
          ref={ref}
          className={styles.fallback}
          style={{ width }}
          onClick={onClick}
        >
          <p>
            <i className="bx bx-image"></i>
            <i className="bx bx-x"></i>
          </p>
          <p>Preview not available for external link:</p>
          <p>
            <a href={src} target="_blank" rel="noopener noreferrer">
              {truncatedSrc}
            </a>
          </p>
        </div>
      )
    }

    return valid ? (
      <img
        ref={ref}
        onClick={onClick}
        src={src}
        width={width}
        height={height}
        alt=""
      />
    ) : (
      <div className={styles.fallback} style={{ width }} onClick={onClick}>
        <p>
          <i className="bx bx-image"></i>
          <i className="bx bx-x"></i>
        </p>
        <p>The following image cannot be displayed:</p>
        <p>
          <a href={src} target="_blank" rel="noopener noreferrer">
            {truncatedSrc}
          </a>
        </p>
      </div>
    )
  }
)
ImageWithFallback.displayName = 'ImageWithFallback'

export const ImageBlock = ({
  block,
  contentState,
  blockProps,
}: {
  block: ContentBlock
  contentState: ContentState
  blockProps: any
}) => {
  const { editorState, setEditorState } = useContext(EditorContext)
  const readOnly = blockProps?.readOnly
  const imageRef = useRef<HTMLImageElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const entity = contentState.getEntity(block.getEntityAt(0))
  const { src, width, height, link } = entity.getData()

  function hidePopover() {
    // Do not setState if link is already removed
    if (imageRef.current) setShowPopover(false)
  }

  function handleClick() {
    if (!showPopover) {
      setShowPopover(true)
      // Set listener only after event has completed bubbling to prevent the current event
      // from closing the popover.
      setTimeout(() => {
        window.addEventListener('click', hidePopover, {
          once: true,
        })
      })
    }
  }

  async function handleRemove() {
    const blockKey = block.getKey()

    // Clear off the entire image block content (usually empty space)
    const rangeToRemove = SelectionState.createEmpty(blockKey).merge({
      anchorKey: blockKey,
      focusKey: blockKey,
      anchorOffset: 0,
      focusOffset: block.getLength(),
    })
    let updatedContentState = Modifier.removeRange(
      contentState,
      rangeToRemove,
      'forward'
    )

    // Delete atomic block from block map
    const blockMap = updatedContentState.getBlockMap().delete(block.getKey())

    // Update selection to next block after deleting current block
    const selectionAfter = SelectionState.createEmpty(
      contentState.getBlockAfter(blockKey).getKey()
    )

    updatedContentState = updatedContentState.merge({
      blockMap,
      selectionAfter,
    }) as ContentState

    // Push updated state to allow for undos
    const updated = EditorState.push(
      editorState,
      updatedContentState,
      'remove-range'
    )

    setEditorState(updated)
  }

  function getUpdateWidth(width: number) {
    return () => {
      // Preserve selection to prevent jumping to start of editor after setting width
      const currentSelection = editorState.getSelection()
      const entityKey = block.getEntityAt(0)
      contentState.mergeEntityData(entityKey, {
        width: `${width}%`,
      })
      const updated = EditorState.push(
        EditorState.forceSelection(editorState, currentSelection),
        contentState,
        'change-block-data'
      )
      setEditorState(updated)
    }
  }

  function renderPreviewImage() {
    return link ? (
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img ref={imageRef} src={src} width={width} height={height} alt="" />
      </a>
    ) : (
      <img ref={imageRef} src={src} width={width} height={height} alt="" />
    )
  }

  return readOnly ? (
    renderPreviewImage()
  ) : (
    <span>
      <ImageWithFallback
        ref={imageRef}
        onClick={handleClick}
        src={src}
        width={width}
        height={height}
      />
      {showPopover && (
        <div contentEditable={false} className={cx('popover', styles.popover)}>
          <button onClick={getUpdateWidth(50)} className={styles.sizeButton}>
            50%
          </button>
          <button onClick={getUpdateWidth(75)} className={styles.sizeButton}>
            75%
          </button>
          <button onClick={getUpdateWidth(100)} className={styles.sizeButton}>
            100%
          </button>
          <span className="divider"></span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.textButton}
            >
              Link <i className="bx bx-link"></i>
            </a>
          )}
          <button onClick={handleRemove} className={styles.textButton}>
            Remove
          </button>
        </div>
      )}
    </span>
  )
}
