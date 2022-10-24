import { useCallback, useEffect, useState } from 'react'
import { Checkbox, ProtectedPreview, TextArea } from 'components/common'
import { debounce } from 'lodash'
import { parse } from 'papaparse'
import { hydrateTemplate } from 'services/validate-csv.service'

import styles from './TemplateTest.module.scss'

const TemplateTest = () => {
  const [body, setBody] = useState('')
  const [csv, setCsv] = useState('')
  const [html, setHtml] = useState('')
  const [removeEmptyLines, setRemoveEmptyLines] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updatePreview = useCallback(
    debounce((template: string, csvString: string, trim: boolean) => {
      try {
        const data = parse(csvString, { header: true }).data as Record<
          string,
          any
        >[]
        const preview = hydrateTemplate(template, data[0], trim)
        setHtml(preview)
      } catch (e) {
        console.error(e)
      }
    }, 300),
    []
  )

  useEffect(() => {
    updatePreview(body, csv, removeEmptyLines)
  }, [body, csv, updatePreview, removeEmptyLines])

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
        <Checkbox checked={removeEmptyLines} onChange={setRemoveEmptyLines}>
          Remove empty lines
        </Checkbox>
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
