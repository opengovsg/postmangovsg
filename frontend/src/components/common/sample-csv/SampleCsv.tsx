import React from 'react'
import { without, times, constant } from 'lodash'

import styles from './SampleCsv.module.scss'

const SampleCsv = ({ params, defaultRecipient }: { params: Array<string>; defaultRecipient: string }) => {

  const RECIPIENT_HEADER = 'recipient'

  function onDownloadFile() {
    // Add recipient column in front, remove if already in params
    const headers = [RECIPIENT_HEADER, ...without(params, RECIPIENT_HEADER)]
    // Set default recipient as first value and pad with placeholder
    const body = [defaultRecipient, ...times(headers.length - 1, constant('abc'))]

    const content = [
      `data:text/csv;charset=utf-8,${headers.join(',')}`,
      `${body.join(',')}`,
    ].join('\n')
    const encodedUri = encodeURI(content)

    // Trigger file download
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'postman_sample.csv')
    document.body.appendChild(link)
    link.click()
  }

  return (
    <a className={styles.sampleCsv} onClick={onDownloadFile}>Download a sample .csv file</a>
  )
}

export default SampleCsv
