import Papa from 'papaparse'
import { keys, difference, uniq } from 'lodash'
import { TemplateClient } from 'postman-templating'

export interface ProtectedCsvInfo {
  csvFilename: string
  numRecipients: number
  preview: string
}

export const PROTECTED_CSV_HEADERS = ['recipient', 'password']

// Using default xss options for registered mail
const templateClient = new TemplateClient()

export function extractParams(template: string): string[] {
  return templateClient.parseTemplate(template).variables
}

/**
 * Ensure that the keywords found in the template is all in the csv headers and each row.
 * Also verifies that the the headers and each row has the following keys:
 * recipient,password
 *
 */
export async function validateCsv(
  file: File,
  template: string,
  recipientValidator: Function
): Promise<ProtectedCsvInfo> {
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
            preview = hydrateTemplate(template, row)
          }
        } catch (e) {
          // If there is errors, append to the errors array
          errors.push(`${count}: ${e.message}`)
          if (errors.length === 3) {
            // abort when there are 3 errors
            parser.abort()
          }
        }
      },
      complete: function () {
        if (errors.length) {
          reject(new Error(`Errors found in csv: \n${errors.join('\n')}`))
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

function removeNewLinesFromTables(template: string) {
  // Get all text within <table> tags
  return template.replace(/<table\s*>(.*?)<\/table\s*>/gs, (match) =>
    // Remove all new lines
    match.replace(/(\r\n|\r|\n)/g, '')
  )
}

export function hydrateTemplate(template: string, row: Record<string, any>) {
  const cleanedTemplate = removeNewLinesFromTables(template)
  const newLinesReplaced = cleanedTemplate.replace(/(?:\r\n|\r|\n)/g, '<br>')
  return templateClient.template(newLinesReplaced, row)
}

// Validate row has required headers and valid recipient
function validateRow(
  row: Record<string, any>,
  requiredParams: Array<string>,
  recipientValidator: Function
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
