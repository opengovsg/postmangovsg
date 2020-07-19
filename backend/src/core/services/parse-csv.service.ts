import Papa, { ParseResult } from 'papaparse'
import { RecipientColumnMissing, UserError } from '@core/errors/s3.errors'
import logger from '@core/logger'
import { CSVParams } from '@core/types'
/**
 * This chunk size was intentionally chosen to be larger than a typical file because multiple inserts to the db slows the process down.
 * For a typical upload, the file will not be chunked.
 * If a file is larger than the DEFAULT_CHUNK_SIZE, it will be chunked to avoid out of memory issues.
 * This configuration has been tested for 5 concurrent requests to upload a 263mb file, on a node process with max memory 512mb.
 */
const DEFAULT_CHUNK_SIZE = 1024 * 1024 * 100 // 100 Mb

/**
 * Downloads s3 file as a stream and processes each chunk separately
 * @param readStream S3 file stream
 * @param onPreview  function to run once before parsing results further
 * @param onChunk  function to run when each chunk is parsed
 * @param onComplete function to after all chunks have been parsed
 */
const parseAndProcessCsv = async (
  readStream: NodeJS.ReadableStream,
  onPreview: (data: CSVParams[]) => Promise<void>,
  onChunk: (data: CSVParams[]) => Promise<void>,
  onComplete: (numRecords: number) => Promise<void>
): Promise<void> => {
  let previewed = false
  let numRecords = 0

  let buffer: CSVParams[] = []
  let approxRowSize = 0
  let batchSize = 0
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

      chunk: async (rows: ParseResult<CSVParams>, parser) => {
        parser.pause()
        const { data, meta, errors } = rows
        try {
          // `rows` can have no data, but just the meta
          if (!previewed && data.length > 0) {
            if (
              meta.fields?.length > 0 &&
              !meta.fields?.includes('recipient')
            ) {
              throw new RecipientColumnMissing()
            }

            await onPreview(data)

            previewed = true

            // Compute the number of rows  the buffer should hold before processing a chunk
            approxRowSize = JSON.stringify(data[0]).length * 4
            batchSize = Math.ceil(DEFAULT_CHUNK_SIZE / approxRowSize)
          }

          // If there are more or fewer headers than values in a row
          if (errors[0]?.type === 'FieldMismatch') {
            // Ignore other parsing errors https://www.papaparse.com/docs#errors
            throw new UserError(errors[0].code, errors[0].message)
          }

          // Manually hold a number of rows in a buffer, because the config
          // chunkSize, Papa.RemoteChunkSize, Papa.LocalChunkSize all do not seem to affect the
          // size of chunk being parsed
          // @see https://github.com/mholt/PapaParse/issues/616
          buffer.push(...data) // Pushes pointers to objects, does not create a new array.
          if (buffer.length >= batchSize) {
            await onChunk(buffer)
            numRecords += buffer.length
            buffer = []
          }
          parser.resume()
        } catch (error) {
          reject(error)
          parser.abort()
        }
      },
      complete: async (rows: ParseResult<any>) => {
        const { meta } = rows
        if (!meta.aborted) {
          try {
            // Process any remaining chunks
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
      },
      error: reject,
    })
  })
}

export const ParseCsvService = { parseAndProcessCsv }
