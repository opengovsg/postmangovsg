import React from 'react'
import { without, times, constant } from 'lodash'
import download from 'downloadjs'

import { extractTemplateParams } from 'services/protectedemail.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import styles from './SampleCsv.module.scss'

const SampleCsv = ({
  params,
  defaultRecipient,
  protect = false,
  contentTemplate,
}: {
  params: Array<string>
  defaultRecipient: string
  protect?: boolean
  contentTemplate?: string
}) => {
  const RECIPIENT_HEADER = ['recipient']
  const RECIPIENT_PROTECTED_HEADER = ['recipient', 'password']

  async function onDownloadFile() {
    let allParams = params
    if (protect && contentTemplate) {
      const protectedParams = await extractTemplateParams(contentTemplate)
      allParams = allParams.concat(protectedParams)
    }
    // Add keyword columns in front, remove if already in params
    const headerKeywords = protect
      ? RECIPIENT_PROTECTED_HEADER
      : RECIPIENT_HEADER
    const headers = [
      ...headerKeywords,
      ...without(allParams, ...headerKeywords),
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
    <a className={styles.sampleCsv} onClick={onDownloadFile}>
      Download a sample .csv file
    </a>
  )
}

export default SampleCsv
