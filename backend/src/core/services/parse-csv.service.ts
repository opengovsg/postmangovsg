import Papa, { ParseResult } from 'papaparse'
import { RecipientColumnMissing } from '@core/errors/s3.errors'
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
      chunk: (rows: ParseResult<CSVParams>) => {
        const { data, meta } = rows // Ignore parsing errors https://www.papaparse.com/docs#errors
        if (meta.fields?.length > 0 && !meta.fields?.includes('recipient'))
          reject(new RecipientColumnMissing())

        data.forEach((row: any) => {
          fileContents.set(row['recipient'], row as CSVParams) // Deduplication
        })
      },
      complete: () => {
        const results = Array.from(fileContents.values())
        logger.info({ message: 'Parsing complete' })
        resolve(results)
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

export const ParseCsvService = {
  parseCsv,
}
