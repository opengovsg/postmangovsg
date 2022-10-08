import { i18n } from '@lingui/core'

import {
  TemplateClient,
  TemplateError,
  XSS_EMAIL_OPTION,
} from '@shared/templating'
import { keys, difference, uniq } from 'lodash'
import Papa from 'papaparse'

import { ALLOWED_IMAGE_SOURCES } from 'config'

export interface ProtectedCsvInfo {
  csvFilename: string
  numRecipients: number
  preview: string
}

export const PROTECTED_CSV_HEADERS = ['recipient', 'password']

const getTemplateClient = (): TemplateClient => {
  return new TemplateClient({
    allowedImageSources: i18n._(ALLOWED_IMAGE_SOURCES).split(';'),
    xssOptions: XSS_EMAIL_OPTION,
  })
}

export function extractParams(template: string): string[] {
  const templateClient = getTemplateClient()
  return templateClient.parseTemplate(template).variables
}

/**
 * Ensure that the keywords found in the template is all in the csv headers and each row.
 * Also verifies that the the headers and each row has the following keys:
 * recipient,password
 *
 */
export async function validateCsv({
  file,
  template,
  recipientValidator,
  removeEmptyLines,
}: {
  file: File
  template: string
  recipientValidator: (email: string) => boolean
  removeEmptyLines: boolean
}): Promise<ProtectedCsvInfo> {
  const csvFilename = file.name
  const templateParams = extractParams(template)
  const requiredParams = uniq(PROTECTED_CSV_HEADERS.concat(templateParams))
  return new Promise((resolve, reject) => {
    const errors: string[] = []
    let preview = ''
    let count = 0
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy', // greedy - skip lines with only whitespace
      step: function (step, parser) {
        try {
          count++
          if (step.errors && step.errors.length) {
            // Get first error from list of errors
            throw new Error(step.errors[0].message)
          }
          const row = step.data
          validateRow(row, requiredParams, recipientValidator)
          if (count === 1) {
            preview = hydrateTemplate(template, row, removeEmptyLines)
          }
        } catch (e) {
          // Exit early if it is a templating error. This can be caused by either the template or first row having invalid values.
          if (e instanceof TemplateError) {
            return reject(
              new Error(
                `The following error occured while generating the message preview. ` +
                  `Please check your template and the first row of your recipient list.\n\n${e}`
              )
            )
          }

          errors.push(`Line ${count}: ${(e as Error).message}`)
          // If there is errors, append to the errors array
          if (errors.length === 3) {
            // abort when there are 3 errors
            parser.abort()
          }
        }
      },
      complete: function () {
        if (errors.length) {
          reject(new Error(`Errors found in CSV: \n${errors.join('\n')}`))
        } else {
          resolve({
            numRecipients: count,
            csvFilename,
            preview,
          })
        }
      },
    })
  })
}

export function hydrateTemplate(
  template: string,
  row: Record<string, any>,
  removeEmptyLines?: boolean
) {
  // Using default xss options for registered mail
  const templateClient = getTemplateClient()
  const hydrated = templateClient.template(template, row, {
    removeEmptyLines,
    replaceNewLines: true,
    removeEmptyLinesFromTables: true,
  })
  return hydrated
}

// Validate row has required headers and valid recipient
function validateRow(
  row: Record<string, any>,
  requiredParams: Array<string>,
  recipientValidator: (email: string) => boolean
): boolean {
  const params = keys(row).map((key) => key.toLowerCase())
  const missingParams = difference(requiredParams, params)
  if (missingParams.length) {
    throw new Error(`Missing params: ${missingParams.join(',')}`)
  }
  if (!recipientValidator(row['recipient'])) {
    throw new Error('Invalid recipient')
  }
  return true
}
