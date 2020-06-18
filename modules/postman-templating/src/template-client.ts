import { mapKeys } from 'lodash'
import xss from 'xss'
import * as Sqrl from 'squirrelly'
import { AstObject, TemplateObject } from 'squirrelly/dist/types/parse'
import { TemplateError } from './errors'

export class TemplateClient {
  xssOptions: xss.IFilterXSSOptions | undefined
  constructor(xssOptions?: xss.IFilterXSSOptions) {
    this.xssOptions = xssOptions
  }

  /**
   * Removes non-whitelisted html tags
   * Replaces new lines with html <br> so that the new lines can be displayed on the front-end
   * @param value
   */
  replaceNewLinesAndSanitize(value: string): string {
    return xss.filterXSS(value.replace(/(\n|\r\n)/g, '<br/>'), this.xssOptions)
  }

  /**
   * returns {
   *    variables - extracted param variables from template
   *    tokens - tokenised strings that can be joined to produce a template
   * }
   * @param templateBody - template body
   * @param params - dict of param variables used for interpolation
   */
  parseTemplate = (
    templateBody: string,
    params?: { [key: string]: string }
  ): {
    variables: Array<string>
    tokens: Array<string>
  } => {
    const variables: Array<string> = []
    const tokens: Array<string> = []

    /**
     * dict used for checking keys in lowercase
     * dict === {} if param === undefined
     */
    const dict = mapKeys(params, (_value, key) => key.toLowerCase())

    try {
      const parseTree = Sqrl.parse(templateBody, Sqrl.defaultConfig)
      parseTree.forEach((astObject: AstObject) => {
        // AstObject = TemplateObject | string

        // normal string (non variable portion)
        if (typeof astObject === 'string') {
          tokens.push(astObject)
          return
        }

        // ie. it is a TemplateObject
        const templateObject = astObject as TemplateObject
        // templateObject.t means TagType, default is r
        // templateObject.raw means ???
        // templateObject.f refers to filter (eg. {{ var | humanize }}), we want to make sure this is empty
        if (
          templateObject.t === 'r' &&
          !templateObject.raw &&
          templateObject.f?.length === 0
        ) {
          /**
           * - templateObject.c has type string | undefined
           * - templateObject.c contains the param key, c stands for content
           * - this is the extracted variable name from the template AST
           * - this extracted key is already trimmed (ie. no leading nor trailing spaces)
           * - coerce to lowercase for comparison
           */
          const key = templateObject.c?.toLowerCase()

          // Have not found a case that triggers this
          if (key === undefined) {
            console.error(
              `Templating error: templateObject.c of ${templateObject} is undefined.`
            )
            throw new TemplateError('TemplateObject has no content')
          }

          if (key.length === 0) {
            throw new TemplateError(
              'Blank template variable provided.\nA correct example is {{person}}, an incorrect example is {{}}.'
            )
          }

          // only allow alphanumeric template, prevents code execution
          const keyHasValidChars = key.match(/[^a-zA-Z0-9]/) === null
          if (!keyHasValidChars) {
            throw new TemplateError(
              `Invalid characters in the keyword: {{${key}}}.\nCheck that the keywords only contain letters and numbers.\nKeywords like {{ Person_Name }} are not allowed, but {{ PersonName }} is allowed.`
            )
          }

          // add key regardless, note that this is also returned in lowercase
          variables.push(key)

          // if no params continue with the loop
          if (!params) return

          // if params provided == attempt to carry out templating
          if (dict[key]) {
            const templated = dict[key]
            tokens.push(templated)
            return
          }

          // recipient key must have param
          if (key === 'recipient')
            throw new TemplateError(`Param ${templateObject.c} not found`)
        } else {
          // FIXME: be more specific about templateObject, just pass the error itself?
          console.error(
            `Templating error: invalid template provided. templateObject= ${JSON.stringify(
              templateObject
            )}`
          )
          throw new TemplateError('Invalid template provided')
        }
      })
      return {
        variables,
        tokens,
      }
    } catch (err) {
      console.error({ message: `${err.stack}` })
      if (err.message.includes('unclosed tag'))
        throw new TemplateError(
          'Check that all the keywords have double curly brackets around them.\nA correct example is {{ keyword }}, and incorrect ones are {{ keyword } or {{ keyword . '
        )
      if (err.message.includes('unclosed string'))
        throw new TemplateError(
          "Check that the keywords only contain letters and numbers.\nKeywords like {{ Person's Name }} are not allowed, but {{ PersonsName }} is allowed."
        )
      if (err.name === 'Squirrelly Error') throw new TemplateError(err.message)
      throw err
    }
  }

  /**
   * Replaces attributes in the template with the parameters specified in the csv
   * @param templateBody
   * @param params
   */
  template(templateBody: string, params: { [key: string]: string }): string {
    const parsed = this.parseTemplate(templateBody, params)
    // Remove extra '\' infront of single quotes and backslashes, added by Squirrelly when it escaped the csv
    const templated = parsed.tokens.join('').replace(/\\([\\'])/g, '$1')
    return xss.filterXSS(templated, this.xssOptions)
  }
}