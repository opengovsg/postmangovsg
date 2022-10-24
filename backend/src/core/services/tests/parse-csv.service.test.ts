import { RecipientColumnMissing, UserError } from '@core/errors'
import { ParseCsvService } from '@core/services/parse-csv.service'
import { CSVParams } from '@core/types'
import { Readable } from 'stream'

const createStream = (
  headers: Array<string>,
  values: Array<Array<string>>
): Readable => {
  const head = [headers.join(',')]
  const valuesArray = values.map((v) => v.join(','))
  if (headers.length === 0 && valuesArray.length === 0)
    return Readable.from('invalid')
  const data = head.concat(valuesArray)
  return Readable.from(data.join('\n'))
}

const onPreview = (_data: CSVParams[]): any => {
  return
}
const onChunk = onPreview
const onComplete = (_numRecords: number): any => {
  return
}
describe('parse-csv', () => {
  describe('parseCsv', () => {
    test('valid file', async () => {
      const params: CSVParams[] = []
      const headers = ['recipient']
      const values = [['test@open.gov.sg']]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )
      expect(params).toEqual([{ recipient: 'test@open.gov.sg' }])
    })

    test('throws error when there is no recipient header', async () => {
      const headers: Array<string> = ['header']
      const values: Array<Array<string>> = [['value']]
      const stream = await createStream(headers, values)
      await expect(
        ParseCsvService.parseAndProcessCsv(
          stream,
          onPreview,
          onChunk,
          onComplete
        )
      ).rejects.toThrow(RecipientColumnMissing)
    })

    test('throws error when there are no rows', async () => {
      const headers: Array<string> = []
      const values: Array<Array<string>> = []
      const stream = await createStream(headers, values)
      await expect(
        ParseCsvService.parseAndProcessCsv(
          stream,
          onPreview,
          onChunk,
          onComplete
        )
      ).rejects.toThrow(UserError)
    })

    test('uppercase headers are converted to lowercase', async () => {
      const params: CSVParams[] = []
      const headers = ['RECIPIENT']
      const values = [['test@open.gov.sg']]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )
      expect(params).toEqual([{ recipient: 'test@open.gov.sg' }])
    })

    test('multiple rows', async () => {
      const params: CSVParams[] = []
      const headers = ['recipient']
      const values = [
        ['test@open.gov.sg'],
        ['test2@open.gov.sg'],
        ['test3@open.gov.sg'],
      ]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )
      expect(params).toEqual([
        { recipient: 'test@open.gov.sg' },
        { recipient: 'test2@open.gov.sg' },
        { recipient: 'test3@open.gov.sg' },
      ])
    })

    test('multiple rows and multiple columns', async () => {
      const params: CSVParams[] = []
      const headers = ['name', 'recipient', 'number']
      const values = [
        ['Ali', 'test@open.gov.sg', '81234567'],
        ['Ahmad', 'test2@open.gov.sg', '91234567'],
        ['Amy', 'test3@open.gov.sg', '99912345'],
      ]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )

      expect(params).toEqual([
        { recipient: 'test@open.gov.sg', name: 'Ali', number: '81234567' },
        { recipient: 'test2@open.gov.sg', name: 'Ahmad', number: '91234567' },
        { recipient: 'test3@open.gov.sg', name: 'Amy', number: '99912345' },
      ])
    })

    test('empty attribute', async () => {
      const params: CSVParams[] = []
      const headers = ['name', 'recipient', 'number']
      const values = [['Ahmad', 'test@open.gov.sg', '']]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )
      expect(params).toEqual([
        { recipient: 'test@open.gov.sg', name: 'Ahmad', number: '' },
      ])
    })

    test('Double quotes allows escaping of special characters', async () => {
      const params: CSVParams[] = []
      const headers = ['message', 'recipient']
      const values = [[`"hello, this is a test"`, 'test@open.gov.sg']]
      const stream = await createStream(headers, values)
      await ParseCsvService.parseAndProcessCsv(
        stream,
        onPreview,
        (data: CSVParams[]): any => {
          params.push(...data)
        },
        onComplete
      )
      expect(params).toEqual([
        { recipient: 'test@open.gov.sg', message: 'hello, this is a test' },
      ])
    })

    test('throws error when double quote is used in unquoted field', async () => {
      const headers = ['message', 'recipient']
      const values = [
        [`New York City,40°42'46"N,74°00'21"W`, 'test@open.gov.sg'],
      ]
      const stream = await createStream(headers, values)
      await expect(
        ParseCsvService.parseAndProcessCsv(
          stream,
          onPreview,
          onChunk,
          onComplete
        )
      ).rejects.toThrow(UserError)
    })

    test('throws error when there are too many fields', async () => {
      const headers = ['message', 'recipient', 'extrafield']
      const values = [[`"hello, this is a test"`, 'test@open.gov.sg']]
      const stream = await createStream(headers, values)
      await expect(
        ParseCsvService.parseAndProcessCsv(
          stream,
          onPreview,
          onChunk,
          onComplete
        )
      ).rejects.toThrow(UserError)
    })

    test('throws error when there are too few fields', async () => {
      const headers = ['message', 'recipient']
      const values = [
        [`"hello, this is a test"`, 'test@open.gov.sg', 'extra value'],
      ]
      const stream = await createStream(headers, values)
      await expect(
        ParseCsvService.parseAndProcessCsv(
          stream,
          onPreview,
          onChunk,
          onComplete
        )
      ).rejects.toThrow(UserError)
    })
  })
})
