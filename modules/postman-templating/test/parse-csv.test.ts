import {
  RecipientColumnMissing,
  UnexpectedDoubleQuoteError,
} from '../src/errors'

import { Readable } from 'stream'

import { parseCsv } from '../src/parse-csv'


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

describe('parseCsv', () => {
  test('valid file', async () => {
    const headers = ['recipient']
    const values = [['test@open.gov.sg']]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
    expect(params).toEqual([{ recipient: 'test@open.gov.sg' }])
  })

  test('throws error when there is no recipient header', async () => {
    const headers: Array<string> = []
    const values: Array<Array<string>> = []
    const stream = await createStream(headers, values)
    await expect(parseCsv(stream)).rejects.toThrow(
      RecipientColumnMissing
    )
  })

  test('uppercase headers are converted to lowercase', async () => {
    const headers = ['RECIPIENT']
    const values = [['test@open.gov.sg']]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
    expect(params).toEqual([{ recipient: 'test@open.gov.sg' }])
  })

  test('multiple rows', async () => {
    const headers = ['recipient']
    const values = [
      ['test@open.gov.sg'],
      ['test2@open.gov.sg'],
      ['test3@open.gov.sg'],
    ]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
    expect(params).toEqual([
      { recipient: 'test@open.gov.sg' },
      { recipient: 'test2@open.gov.sg' },
      { recipient: 'test3@open.gov.sg' },
    ])
  })

  test('multiple rows and multiple columns', async () => {
    const headers = ['name', 'recipient', 'number']
    const values = [
      ['Ali', 'test@open.gov.sg', '81234567'],
      ['Ahmad', 'test2@open.gov.sg', '91234567'],
      ['Amy', 'test3@open.gov.sg', '99912345'],
    ]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
    expect(params).toEqual([
      { recipient: 'test@open.gov.sg', name: 'Ali', number: '81234567' },
      { recipient: 'test2@open.gov.sg', name: 'Ahmad', number: '91234567' },
      { recipient: 'test3@open.gov.sg', name: 'Amy', number: '99912345' },
    ])
  })

  test('empty attribute', async () => {
    const headers = ['name', 'recipient', 'number']
    const values = [['Ahmad', 'test@open.gov.sg', '']]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
    expect(params).toEqual([
      { recipient: 'test@open.gov.sg', name: 'Ahmad', number: '' },
    ])
  })

  test('Double quotes allows escaping of special characters', async () => {
    const headers = ['message', 'recipient']
    const values = [[`"hello, this is a test"`, 'test@open.gov.sg']]
    const stream = await createStream(headers, values)
    const params = await parseCsv(stream)
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
    await expect(parseCsv(stream)).rejects.toThrow(
      UnexpectedDoubleQuoteError
    )
  })
})