import React, { RefObject } from 'react'
import { without, times, constant } from 'lodash'
import download from 'downloadjs'

import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import styles from './SampleCsv.module.scss'

const SampleCsv = ({
  params,
  defaultRecipient,
  elementRef,
}: {
  params: Array<string>
  defaultRecipient: string
  elementRef?: RefObject<HTMLAnchorElement>
}) => {
  const RECIPIENT_KEYWORDS = ['recipient', 'password']

  function onDownloadFile(
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) {
    // Add recipient column in front, remove if already in params
    const headers = [
      ...RECIPIENT_KEYWORDS,
      ...without(params, ...RECIPIENT_KEYWORDS),
    ]
    // Set default recipient as first value and pad with placeholder
    const body = [
      defaultRecipient,
      ...times(headers.length - 1, constant('abc')),
    ]

    const content = [`${headers.join(',')}`, `${body.join(',')}`].join('\r\n')

    download(content, 'postman_sample.csv', 'text/csv')

    sendUserEvent(GA_USER_EVENTS.DOWNLOAD_SAMPLE_FILE)
  }

  return (
    <a ref={elementRef} className={styles.sampleCsv} onClick={onDownloadFile}>
      Download a sample .csv file
    </a>
  )
}

export default SampleCsv
