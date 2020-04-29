import React from 'react'

import styles from './SampleCsv.module.scss'

const SampleCsv = ({ params, defaultRecipient }: { params: Array<string>; defaultRecipient: string }) => {

  function onDownloadFile() {
    const headers: Array<string> = params
    const body: Array<string> = Array(params.length).fill('abc')

    if (headers.indexOf('recipient') === -1) {
      headers.push('recipient')
      body.push(defaultRecipient)
    } else {
      // if receipient is part of params, insert default recipient value
      body[headers.indexOf('recipient')] = defaultRecipient
    }

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
