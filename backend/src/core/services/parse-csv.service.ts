import Papa, { ParseResult, ParseError } from 'papaparse'
import { RecipientColumnMissing, UserError } from '@core/errors/s3.errors'
import logger from '@core/logger'
import { CSVParams } from '@core/types'
const DEFAULT_CHUNK_SIZE = 1024 * 1024 * 10 // 10 Mb
/**
 * Ensures that the recipient column exists and converts headers to lowercase
 * Deduplicates the csv by overriding the same recipient with newer records
 * @param readStream
 */
const parseCsv = async (
  readStream: NodeJS.ReadableStream
): Promise<CSVParams[]> => {
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

const parseAndProcessCsv = async (
  readStream: NodeJS.ReadableStream,
  onPreview: (data: CSVParams[]) => Promise<void>,
  onChunk: (data: CSVParams[]) => Promise<void>,
  onComplete: (numRecords: number) => Promise<void>
): Promise<void> => {
  let previewed = false
  let numRecords = 0
  // Papa.LocalChunkSize = String(DEFAULT_CHUNK_SIZE)
  // Papa.RemoteChunkSize = String(DEFAULT_CHUNK_SIZE)
  let buffer: CSVParams[] = []
  let approxRowSize = 0
  let batchSize = 0
  return new Promise((resolve, reject) => {
    console.time('parseAndProcessCsv')
    Papa.parse(readStream, {
      // chunkSize: DEFAULT_CHUNK_SIZE,
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // @see https://stackoverflow.com/questions/11305797/remove-zero-width-space-characters-from-a-javascript-string
        const lowercaseHeader = header
          .toLowerCase()
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
        return lowercaseHeader
      },

      chunk: async (rows: ParseResult<CSVParams>, parser) => {
        parser.pause()
        const { data, meta, errors } = rows
        try {
          if (!previewed && data.length > 0) {
            if (
              meta.fields?.length > 0 &&
              !meta.fields?.includes('recipient')
            ) {
              throw new RecipientColumnMissing()
            }

            await onPreview(data)

            previewed = true

            approxRowSize = JSON.stringify(data[0]).length * 4
            batchSize = Math.ceil(DEFAULT_CHUNK_SIZE / approxRowSize)
          }

          if (errors[0]?.type === 'FieldMismatch') {
            // Ignore other parsing errors https://www.papaparse.com/docs#errors
            throw new UserError(errors[0].code, errors[0].message)
          }

          buffer.push(...data)
          if (buffer.length >= batchSize) {
            await onChunk(buffer)
            numRecords += buffer.length
            buffer = []
          }
          parser.resume()
        } catch (error) {
          console.error(`error in chunk ${error}`)
          reject(error)
          parser.abort()
        }
      },
      complete: async (rows: ParseResult<any>) => {
        const { meta } = rows
        if (!meta.aborted) {
          try {
            if (buffer.length > 0) {
              await onChunk(buffer)
              numRecords += buffer.length
              buffer = []
            }
            if (numRecords === 0) {
              throw new UserError(
                'NoRowsFound',
                'No rows were found in the uploaded file.'
              )
            }
            await onComplete(numRecords)
          } catch (err) {
            console.error(`error in complete: ${err}`)
            reject(err)
          }
        }

        logger.info({ message: 'Parsing complete' })
        resolve()
        console.timeEnd('parseAndProcessCsv')
      },
      error: (error: ParseError) => {
        console.error(`error in error: ${error}`)
        reject(error)
        // eslint-disable-next-line no-console
        console.timeEnd('parseAndProcessCsv')
      },
    })
  })
}

export const ParseCsvService = { parseCsv, parseAndProcessCsv }
