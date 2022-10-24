import { i18n } from '@lingui/core'
import { ALLOWED_IMAGE_SOURCES } from 'config'

/**
 * Checks if an img src value is valid by creating a non-mounted image element
 * @param imgSrc
 * @returns whether imgSrc is valid
 */
export function isImgSrcValid(imgSrc: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    img.onerror = () => {
      resolve(false)
    }
    img.onload = () => resolve(true)
    img.src = imgSrc
  })
}

/**
 * Checks if an imgSrc is from an allowed domain
 * @param imgSrc
 * @returns whether imgSrc is valid
 */
export function isExternalImage(imgSrc: string): boolean {
  const allowed = i18n._(ALLOWED_IMAGE_SOURCES).split(';')
  const url = new URL(imgSrc)
  return !allowed.includes(url.host)
}
