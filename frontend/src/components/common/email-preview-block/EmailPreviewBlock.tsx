import cx from 'classnames'
import { useState, useEffect } from 'react'
import type { FC } from 'react'

import DetailBlock from '../detail-block'
import { isImgSrcValid, isExternalImage } from '../rich-text-editor/utils/image'

import styles from './EmailPreviewBlock.module.scss'

interface EmailPreviewBlockProps {
  body: string
  themedBody?: string
  subject?: string
  replyTo?: string | null
  from?: string
  className?: string
}

const preprocessImages = async (html: string): Promise<string> => {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')
  const images = parsed.body.querySelectorAll('img')

  const createPlaceholder = (src: string, width: number, message: string) => {
    const placeholder = document.createElement('div')
    placeholder.className = styles.imagePlaceholder
    placeholder.style.width = `${width}%`
    placeholder.innerHTML = `
      <p>
        <i class="bx bx-image"></i>
        <i class="bx bx-x"></i>
      </p>
      <p>${message}</p>
      <p>
        <a href="${src}" target="_blank" rel="noopener noreferrer">
          ${src.substring(0, 64) + (src.length > 64 ? '...' : '')}
        </a>
      </p>
    `

    return placeholder
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const { src, width } = image

    if (isExternalImage(src)) {
      const placeholder = createPlaceholder(
        src,
        width,
        'Preview not available for external link:'
      )

      // Replace the image node with placeholder
      image.parentNode?.insertBefore(placeholder, image)
      image.parentNode?.removeChild(image)
    } else if (!(await isImgSrcValid(src))) {
      const placeholder = createPlaceholder(
        src,
        width,
        'The following image cannot be displayed:'
      )

      // Replace the image node with placeholder
      image.parentNode?.insertBefore(placeholder, image)
      image.parentNode?.removeChild(image)
    }
  }

  return parsed.body.innerHTML
}

const EmailPreviewBlock: FC<EmailPreviewBlockProps> = ({
  body,
  themedBody,
  subject,
  replyTo,
  from,
  className,
}) => {
  const [preprocessed, setPreprocessed] = useState('')
  useEffect(() => {
    const formatHtml = async (html: string) => {
      const formatted = await preprocessImages(html)
      setPreprocessed(formatted)
    }

    if (themedBody) void formatHtml(themedBody)
  }, [themedBody])

  if (!body && !subject && !preprocessed) {
    return (
      <DetailBlock>
        <li>
          <i className="bx bx-loader-alt bx-spin"></i>
          <p>Loading preview...</p>
        </li>
      </DetailBlock>
    )
  }

  return (
    <>
      <div className={cx(styles.previewInfo, className)}>
        <h5>From</h5>
        <p>{from}</p>

        <h5>Subject</h5>
        <p>{subject}</p>

        <h5>Replies</h5>
        <p>{replyTo}</p>
      </div>

      <div
        className={styles.previewBody}
        dangerouslySetInnerHTML={{
          __html: preprocessed,
        }}
      ></div>
    </>
  )
}

export default EmailPreviewBlock
