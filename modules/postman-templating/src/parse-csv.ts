import CSVParse from 'csv-parse'
import { CSVParams } from './types'
import { isEmpty } from 'lodash'
import { 
  RecipientColumnMissing,
  UnexpectedDoubleQuoteError
} from './errors'
/**
 * Ensures that the recipient column exists and converts headers to lowercase
 * Deduplicates the csv by overriding the same recipient with newer records
 * @param readStream
 */
export const parseCsv = async (readStream: NodeJS.ReadableStream): Promise<Array<CSVParams>> => {
  const parser = CSVParse({
    delimiter: ',',
    trim: true,
    skip_empty_lines: true,
  })
  try {
    readStream.on('error', (err) => {
      // Pass error from s3 to csv parser
      parser.emit('error', err)
    })
    readStream.pipe(parser)
    let headers: string[] = []
    let recipientIndex: number
    const params: Map<string, CSVParams> = new Map()
    for await (const row of parser) {
      if (isEmpty(headers)) {
        // @see https://stackoverflow.com/questions/11305797/remove-zero-width-space-characters-from-a-javascript-string
        const lowercaseHeaders = row.map((col: string) =>
          col.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '')
        )
        recipientIndex = lowercaseHeaders.indexOf('recipient')
        if (recipientIndex === -1) throw new RecipientColumnMissing()
        headers = lowercaseHeaders
      } else {
        const rowWithHeaders: CSVParams = {}
        row.forEach((col: any, index: number) => {
          rowWithHeaders[headers[index]] = col
        })
        // produces {header1: value1, header2: value2, ...}
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params.set(row[recipientIndex!], rowWithHeaders) // Deduplication
      }
    }
    return Array.from(params.values())
  } catch (err) {
    if (err.message.includes('Invalid Opening Quote'))
      throw new UnexpectedDoubleQuoteError()
    if (err.message.includes('Invalid Closing Quote'))
      throw new UnexpectedDoubleQuoteError()
    throw err
  }
}