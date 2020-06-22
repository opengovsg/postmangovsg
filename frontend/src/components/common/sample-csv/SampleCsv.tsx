import React from 'react'
import { without, times, constant } from 'lodash'
import download from 'downloadjs'

import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import styles from './SampleCsv.module.scss'

const SampleCsv = ({
  params,
  defaultRecipient,
}: {
  params: Array<string>
  defaultRecipient: string
}) => {
  const RECIPIENT_HEADER = 'recipient'

  function onDownloadFile() {
    // Add recipient column in front, remove if already in params
    const headers = [RECIPIENT_HEADER, ...without(params, RECIPIENT_HEADER)]
    // Set default recipient as first value and pad with placeholder
    const body = [
      defaultRecipient,
      ...times(headers.length - 1, constant('abc')),
    ]

    const content = [`${headers.join(',')}`, `${body.join(',')}`].join('\n')

    download(content, 'postman_sample.csv', 'text/csv')

    sendUserEvent(GA_USER_EVENTS.DOWNLOAD_SAMPLE_FILE)
  }

  return (
    <a className={styles.sampleCsv} onClick={onDownloadFile}>
      Download a sample .csv file
    </a>
  )
}

export default SampleCsv
