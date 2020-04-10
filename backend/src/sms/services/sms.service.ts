import * as Sqrl from 'squirrelly'
import { SmsTemplate } from '@sms/models'
import { AstObject, TemplateObject } from 'squirrelly/dist/types/parse'

// FIXME: handle edge case of x.y

/**
 * returns {
 *    variables - extracted param variables from template
 *    tokens - tokenised strings that can be joined to produce a template
 * }
 * @param templateBody - template body
 * @param params - dict of param variables used for interpolation
 */
const parseTemplate = (templateBody: string, params?: {[key: string]: string}) => {
  const variables: Array<string> = []
  const tokens: Array<string> = []
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
          if (params) {
            // templateObject.c contains the param key, c stands for content
            if (templateObject.c && params[templateObject.c]) {
              const key = params[templateObject.c]
              // prevents code execution
              const keyHasValidChars = (key.match(/[^a-zA-z0-9]/) === null)
              if (!keyHasValidChars) {
                throw new Error(`invalid characters in param ${key}`)
              }
              variables.push(key)
              tokens.push(key)
            } else {
              throw new Error(`Param ${templateObject.c} not found`)
            }
          }
        } else {
          // FIXME: be more specific about templateObject, just pass the error itself?
          throw new Error(`Invalid template provided: ${JSON.stringify(templateObject)}`)
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
    throw err
  }
}

const template = (templateBody: string, params: {[key: string]: string}): string => {
  const parsed = parseTemplate(templateBody, params)
  return parsed.tokens.join('')
}

const upsertTemplate = (body: string, campaignId: number) => {
  return SmsTemplate.upsert({
    campaignId, body,
  })
}

export { template, parseTemplate, upsertTemplate }