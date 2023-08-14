import download from 'downloadjs'
import { without } from 'lodash'

import TextButton from '../text-button'

import styles from './SampleCsv.module.scss'

import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import {
  PROTECTED_CSV_HEADERS,
  extractParams,
} from 'services/validate-csv.service'

const SampleCsv = ({
  defaultRecipient,
  params,
  defaultParams,
  template,
  protect = false,
  setErrorMsg,
}: {
  defaultRecipient: string
  params?: Array<string>
  defaultParams?: Record<string, string>
  template?: string
  protect?: boolean
  setErrorMsg?: (message: string | null) => void
}) => {
  const RECIPIENT_HEADER = ['recipient']

  async function onDownloadFile() {
    try {
      let variableHeaders = params
      if (protect) {
        variableHeaders = template ? await extractParams(template) : []
      }
      // Add keyword columns in front, remove if already in params
      const fixedHeaders = protect ? PROTECTED_CSV_HEADERS : RECIPIENT_HEADER
      const headers = [
        ...fixedHeaders,
        ...without(variableHeaders, ...fixedHeaders),
      ]

      const variableRow = Array(headers.length - 1).fill('abc')
      if (params && defaultParams) {
        for (const key in defaultParams) {
          const indexInVariableRow = params.findIndex((param) => param === key)
          if (indexInVariableRow < 0) {
            continue
          }
          variableRow[indexInVariableRow] = defaultParams[key]
        }
      }

      // Set default recipient as first value and pad with placeholder
      const body = [defaultRecipient, ...variableRow]

      const content = [`${headers.join(',')}`, `${body.join(',')}`].join('\r\n')

      download(content, 'postman_sample.csv', 'text/csv')

      sendUserEvent(GA_USER_EVENTS.DOWNLOAD_SAMPLE_FILE)
    } catch (e) {
      setErrorMsg ? setErrorMsg((e as Error).message) : console.error(e)
    }
  }

  return (
    <TextButton className={styles.sampleCsv} onClick={onDownloadFile}>
      Download a sample .csv file
    </TextButton>
  )
}

export default SampleCsv
