import React from 'react'

import styles from './SampleCsv.module.scss'

const SampleCsv = ({ params }: { params: Array<string> }) => {

  function onDownloadFile() {
    const dummyRecipient = '88888888'
    const content = [
      `data:text/csv;charset=utf-8,${params.join(',')}, recipient`,
      `${Array(params.length).fill('abc')},${dummyRecipient}`,
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
