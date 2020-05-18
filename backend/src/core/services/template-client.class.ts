import { difference, keys, mapKeys } from 'lodash'
import xss from 'xss'
import * as Sqrl from 'squirrelly'
import { AstObject, TemplateObject } from 'squirrelly/dist/types/parse'

import S3Client from '@core/services/s3-client.class'
import logger from '@core/logger'
import { MissingTemplateKeysError, TemplateError, InvalidRecipientError } from '@core/errors/template.errors'
import { isSuperSet } from '@core/utils'



type ValidateRecipientFunction = (recipient: string) => boolean
export default class TemplateClient {
  xssOptions: xss.IFilterXSSOptions | undefined
  validateRecipient: ValidateRecipientFunction | undefined
  /**
   * Constructor for TemplateClient
   * @param validateRecipient Function to test if recipient is of a valid format
   * @param xssOptions Whitelist of html tags that will not be stripped
   */
  constructor(xssOptions?: xss.IFilterXSSOptions, validateRecipient?: ValidateRecipientFunction) {
    this.xssOptions = xssOptions
    this.validateRecipient = validateRecipient
  }

  replaceNewLinesAndSanitize(value: string): string {
    return xss.filterXSS(value.replace(/(\n|\r\n)/g,'<br/>'), this.xssOptions)
  }
  
  // FIXME: handle edge case of x.y

  /**
   * returns {
   *    variables - extracted param variables from template
   *    tokens - tokenised strings that can be joined to produce a template
   * }
   * @param templateBody - template body
   * @param params - dict of param variables used for interpolation
   */
  parseTemplate(templateBody: string, params?: { [key: string]: string }): {
    variables: Array<string>;
    tokens: Array<string>;
  } {
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
              const keyHasValidChars = (key.match(/[^a-zA-Z0-9]/) === null)
              if (!keyHasValidChars) {
                throw new TemplateError(`Invalid characters in param named {{${key}}}. Only alphanumeric characters allowed.`)
              }
  
              // add key regardless, note that this is also returned in lowercase
              variables.push(key)
              
              // if no params continue with the loop
              if (!params) return
              
              if (key === 'recipient') {
                const recipient = dict[key]
                if (!recipient) {
                  // recipient key must have param
                  throw new TemplateError(`Param ${templateObject.c} not found`)
                } else if (this.validateRecipient !== undefined && !this.validateRecipient(recipient)) {
                  throw new InvalidRecipientError()
                }
              }
             

              // if params provided == attempt to carry out templating
              if (dict[key]) {
                const templated = dict[key]
                tokens.push(templated)
                return
              }
  
            } else { // I have not found an edge case that trips this yet
              logger.error(`Templating error: templateObject.c of ${templateObject} is undefined.`)
              throw new TemplateError('TemplateObject has no content')
            }
          } else {
            // FIXME: be more specific about templateObject, just pass the error itself?
            logger.error (`Templating error: invalid template provided. templateObject= ${JSON.stringify(templateObject)}`)
            throw new TemplateError('Invalid template provided')
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
      logger.error({ message: `${err.stack}` })
      if (err.message.includes('unclosed tag')) throw new TemplateError('There are unclosed curly brackets in the template')
      if (err.name === 'Squirrelly Error') throw new TemplateError(err.message)
      throw err
    }
  }

  template(templateBody: string, params: { [key: string]: string }): string {
    const parsed = this.parseTemplate(templateBody, params)
    // Remove extra '\' infront of single quotes and backslashes
    const templated = parsed.tokens.join('').replace(/\\([\\'])/g, '$1')
    return xss.filterXSS(templated, this.xssOptions)
  }

  private checkTemplateKeysMatch(csvRecord: { [key: string]: string }, templateParams: Array<string>): void {
    // if body exists, smsTemplate.params should also exist
    if (!isSuperSet(keys(csvRecord), templateParams)) {
      const missingKeys = difference(templateParams, keys(csvRecord))
      throw new MissingTemplateKeysError(missingKeys)
    }
  }

  async testHydration({
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
  }): Promise<TestHydrationResult> {
    const s3Client = new S3Client()
    const downloadStream = s3Client.download(s3Key)
    const fileContents = await s3Client.parseCsv(downloadStream)
  
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
    this.checkTemplateKeysMatch(firstRecord, templateParams)
  
    const hydratedRecord = { body: this.template(templateBody, records[0].params) } as { body: string; subject?: string }
  
    if (templateSubject) {
      hydratedRecord.subject = this.template(templateSubject, records[0].params)
    }
  
    return {
      records,
      hydratedRecord,
    }
  }
} 
