import React from 'react'
import { without, times, constant } from 'lodash'
import download from 'downloadjs'

import { extractTemplateParams } from 'services/protected.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import TextButton from '../text-button'

const SampleCsv = ({
  defaultRecipient,
  params,
  template,
  protect = false,
}: {
  defaultRecipient: string
  params?: Array<string>
  template?: string
  protect?: boolean
}) => {
  const RECIPIENT_HEADER = ['recipient']
  const RECIPIENT_PROTECTED_HEADER = ['recipient', 'password']

  async function onDownloadFile() {
    let variableHeaders = params
    if (protect) {
      variableHeaders = template ? await extractTemplateParams(template) : []
    }
    // Add keyword columns in front, remove if already in params
    const fixedHeaders = protect ? RECIPIENT_PROTECTED_HEADER : RECIPIENT_HEADER
    const headers = [
      ...fixedHeaders,
      ...without(variableHeaders, ...fixedHeaders),
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
    <TextButton onClick={onDownloadFile}>
      Download a sample .csv file
    </TextButton>
  )
}

export default SampleCsv
