import Papa, { ParseResult, ParseError } from 'papaparse'
import { RecipientColumnMissing, UserError } from '@core/errors/s3.errors'
import logger from '@core/logger'
import { CSVParams } from '@core/types'

/**
 * Ensures that the recipient column exists and converts headers to lowercase
 * Deduplicates the csv by overriding the same recipient with newer records
 * @param readStream
 */
const parseCsv = async (
  readStream: NodeJS.ReadableStream
): Promise<Array<CSVParams>> => {
  const fileContents: Map<string, CSVParams> = new Map()
  return new Promise((resolve, reject) => {
    Papa.parse(readStream, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // @see https://stackoverflow.com/questions/11305797/remove-zero-width-space-characters-from-a-javascript-string
        const lowercaseHeader = header
          .toLowerCase()
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
        return lowercaseHeader
      },
      chunk: (rows: ParseResult<CSVParams>, parser: Papa.Parser) => {
        try {
          const { data, meta, errors } = rows
          if (meta.fields?.length > 0 && !meta.fields?.includes('recipient'))
            throw new RecipientColumnMissing()
          if (errors[0]?.type === 'FieldMismatch')
            // Ignore other parsing errors https://www.papaparse.com/docs#errors
            throw new UserError(errors[0].code, errors[0].message)

          data.forEach((row: any) => {
            fileContents.set(row['recipient'], row as CSVParams) // Deduplication
          })
        } catch (error) {
          reject(error)
          parser.abort()
        }
      },
      complete: () => {
        const results = Array.from(fileContents.values())
        logger.info({ message: 'Parsing complete' })
        resolve(results)
      },
      error: (error: ParseError) => {
        reject(error)
      },
    })
  })
}

export const ParseCsvService = {
  parseCsv,
}
