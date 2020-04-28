import S3 from 'aws-sdk/clients/s3'
import { difference, keys, mapKeys } from 'lodash'
import * as Sqrl from 'squirrelly'
import { AstObject, TemplateObject } from 'squirrelly/dist/types/parse'

import { S3Service } from '@core/services/s3.service'
import { isSuperSet } from '@core/utils'
import logger from '@core/logger'
import { MissingTemplateKeysError, TemplateError} from '@core/errors/template.errors'

const s3Client = new S3()

// FIXME: handle edge case of x.y

/**
 * returns {
 *    variables - extracted param variables from template
 *    tokens - tokenised strings that can be joined to produce a template
 * }
 * @param templateBody - template body
 * @param params - dict of param variables used for interpolation
 */
const parseTemplate = (templateBody: string, params?: { [key: string]: string }): {
  variables: Array<string>;
  tokens: Array<string>;
} => {
  const variables: Array<string> = []
  const tokens: Array<string> = []

  /**
   * dict used for checking keys in lowercase
   * dict === {} if param === undefined
  */
  const dict = mapKeys(params, (_value, key) => key.toLowerCase())

  try {
    const parseTree = (Sqrl.parse(templateBody, Sqrl.defaultConfig))
    parseTree.forEach((astObject: AstObject) => {
      // AstObject = TemplateObject | string
      if (typeof astObject !== 'string') { // ie. it is a TemplateObject
        const templateObject = astObject as TemplateObject
        // templateObject.t means TagType, default is r
        // templateObject.raw means ???
        // templateObject.f refers to filter (eg. {{ var | humanize }}), we want to make sure this is empty
        if (templateObject.t === 'r' && !templateObject.raw && templateObject.f?.length === 0) {
          /**
           * - templateObject.c has type string | undefined
           * - templateObject.c contains the param key, c stands for content
           * - this is the extracted variable name from the template AST
           * - this extracted key is already trimmed (ie. no leading nor trailing spaces)
           * - coerce to lowercase for comparison
          */
          const key = templateObject.c?.toLowerCase()

          if (key !== undefined) {

            if (key.length === 0) {
              throw new TemplateError('Blank template variable provided')
            }

            // only allow alphanumeric template, prevents code execution
            const keyHasValidChars = (key.match(/[^a-zA-z0-9]/) === null)
            if (!keyHasValidChars) {
              throw new TemplateError(`Invalid characters in param named {{${key}}}. Only alphanumeric characters allowed.`)
            }

            // if params provided == attempt to carry out templating
            if (params) {
              if (dict[key]) {
                const templated = dict[key]
                tokens.push(templated)
              } else {
                throw new TemplateError(`Param ${templateObject.c} not found`)
              }
            }

            // add key regardless, note that this is also returned in lowercase
            variables.push(key)

          } else { // I have not found an edge case that trips this yet
            logger.error(`Templating error: templateObject.c of ${templateObject} is undefined.`)
            throw new TemplateError('TemplateObject has no content')
          }
        } else {
          // FIXME: be more specific about templateObject, just pass the error itself?
          throw new TemplateError(`Invalid template provided: ${JSON.stringify(templateObject)}`)
        }
      } else {
        // normal string (non variable portion)
        tokens.push(astObject)
      }
    })
    return {
      variables,
      tokens,
    }
  } catch (err) {
    console.error(err.message)
    if (err.message.includes('unclosed tag')) throw new TemplateError('There are unclosed curly brackets in the template')
    throw err
  }
}

const template = (templateBody: string, params: { [key: string]: string }): string => {
  const parsed = parseTemplate(templateBody, params)
  return parsed.tokens.map((t) => t.replace(/\\([\\\'])/g, "$1")).join('')
}

const checkTemplateKeysMatch = (csvRecord: { [key: string]: string }, templateParams: Array<string>): void => {
  // if body exists, smsTemplate.params should also exist
  if (!isSuperSet(keys(csvRecord), templateParams)) {
    const missingKeys = difference(templateParams, keys(csvRecord))
    throw new MissingTemplateKeysError(missingKeys)
  }
}

const testHydration = async ({
  campaignId,
  s3Key,
  templateSubject,
  templateBody,
  templateParams,
}: {
  campaignId: number;
  s3Key: string;
  templateSubject?: string;
  templateBody: string;
  templateParams: Array<string>;
}): Promise<TestHydrationResult> => {
  const s3Service = new S3Service(s3Client)
  const downloadStream = s3Service.download(s3Key)
  const fileContents = await s3Service.parseCsv(downloadStream)

  const records: Array<MessageBulkInsertInterface> = fileContents.map(
    (entry) => {
      return {
        campaignId,
        recipient: entry['recipient'],
        params: entry,
      }
    }
  )

  // attempt to hydrate
  const firstRecord = fileContents[0]
  checkTemplateKeysMatch(firstRecord, templateParams)

  const hydratedRecord = { body: template(templateBody, records[0].params) } as { body: string; subject?: string }

  if (templateSubject) {
    hydratedRecord.subject = template(templateSubject, records[0].params)
  }

  return {
    records,
    hydratedRecord,
  }
}


export { template, parseTemplate, testHydration }