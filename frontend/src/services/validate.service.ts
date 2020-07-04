import Papa from 'papaparse'
import { keys, difference } from 'lodash'

export interface CsvStatus {
  csvFilename?: string
  csvError?: string
  numRecipients?: number
  preview?: string
}

/**
 * Ensure that the keywords found in the template is all in the csv headers and each row.
 * Also verifies that the the headers and each row has the following keys:
 * recipient,password
 *
 */
export async function validateCsv(
  file: File,
  templateParams: Array<string>
): Promise<CsvStatus> {
  try {
    await validateHeaders(file, templateParams)
    await validateRows(file, templateParams)
  } catch (err) {
    // if there is an error, return a csv status with the error message
    return Promise.resolve({
      csvError: err,
      numRecipients: 0,
      preview: 'This is a preview of message B',
      csvFilename: file.name,
    })
  }
  return Promise.resolve({
    csvError: '',
    numRecipients: 123,
    preview: 'This is a preview of message B',
    csvFilename: file.name,
  })
}

/**
 * Read only the headers of the csv file
 *
 */
async function validateHeaders(
  file: File,
  templateParams: Array<string>
): Promise<void> {
  await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      delimiter: ',',
      step: function (_, parser: Papa.Parser) {
        // Checks header only
        parser.pause()
        parser.abort()
      },
      complete: function (results) {
        const headers = results.data as Array<string>
        try {
          checkTemplateKeys(headers, templateParams)
          checkEssentialKeys(headers)
        } catch (e) {
          reject(e.message)
        }
        resolve()
      },
    })
  })
}

/**
 * Read the file row by row and ensure that all the required params are there.
 *
 */
async function validateRows(
  file: File,
  templateParams: Array<string>
): Promise<void> {
  await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      step: function (step) {
        // If there is errors, append to the errors array
        if (step.errors.length != 0) {
          reject(`Error parsing file.`)
        }
        // Check params
        const params = step.data

        try {
          const paramKeys = keys(params)
          checkTemplateKeys(paramKeys, templateParams)
          checkEssentialKeys(paramKeys)
        } catch (e) {
          reject(e.message)
        }
      },
      complete: function () {
        resolve()
      },
    })
  })
}

/**
 * Checks that all the template keys are present in the params
 *
 */
function checkTemplateKeys(
  params: Array<string>,
  templateParams: Array<string>
): void {
  // Check for keys that is in the template but not params
  const extraKeysInTemplate = difference(templateParams, params)
  if (extraKeysInTemplate.length != 0) {
    throw new Error(`Template keys missing from params: ${extraKeysInTemplate}`)
  }
}

/**
 * Checks that the required keys are present in the params
 *
 */
function checkEssentialKeys(params: Array<string>): void {
  // Check for essential keys
  const essentialKeys = ['recipient', 'password']
  const missingKeys = difference(essentialKeys, params)
  if (missingKeys.length != 0) {
    throw new Error(`Essential keys missing from params: ${missingKeys}`)
  }
}
