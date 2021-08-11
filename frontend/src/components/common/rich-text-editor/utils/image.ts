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

export function isExternalImage(imgSrc: string): boolean {
  const url = new URL(imgSrc)
  return !['file.go.gov.sg'].includes(url.host)
}
