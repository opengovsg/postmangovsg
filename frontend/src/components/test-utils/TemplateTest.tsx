import React, { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash'
import { parse } from 'papaparse'
import { hydrateTemplate } from 'services/validate-csv.service'

import { TextArea, ProtectedPreview } from 'components/common'
import styles from './TemplateTest.module.scss'

const TemplateTest = () => {
  const [body, setBody] = useState('')
  const [csv, setCsv] = useState('')
  const [html, setHtml] = useState('')

  const updatePreview = useCallback(
    debounce((template: string, csvString: string) => {
      try {
        const data = parse(csvString, { header: true }).data as Record<
          string,
          any
        >[]
        const preview = hydrateTemplate(template, data[0])
        setHtml(preview)
      } catch (e) {
        console.error(e)
      }
    }, 300),
    []
  )

  useEffect(() => {
    updatePreview(body, csv)
  }, [body, csv, updatePreview])

  return (
    <div className={styles.container}>
      <div className={styles.editColumn}>
        <TextArea
          highlight={true}
          onChange={setBody}
          value={body}
          placeholder="Paste template here"
        />
        <TextArea
          highlight={true}
          onChange={setCsv}
          value={csv}
          placeholder="Paste csv here"
        />
      </div>
      <div className={styles.previewColumn}>
        <div className={styles.previewContainer}>
          <ProtectedPreview html={html} />
        </div>
      </div>
    </div>
  )
}

export default TemplateTest
