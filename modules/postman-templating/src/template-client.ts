import { mapKeys } from 'lodash'
import xss from 'xss'
import * as Sqrl from 'squirrelly'
import { AstObject, TemplateObject } from 'squirrelly/dist/types/parse'
import { TemplateError } from './errors'
import { TemplatingConfig, TemplatingConfigDefault } from './interfaces'

export class TemplateClient {
  xssOptions: xss.IFilterXSSOptions | undefined
  lineBreak: string

  constructor(xssOptions?: xss.IFilterXSSOptions, lineBreak = '<br />') {
    this.xssOptions = xssOptions
    this.lineBreak = lineBreak
  }

  /**
   * Removes non-whitelisted html tags
   * Replaces new lines with html <br> so that the new lines can be displayed on the front-end
   * @param value
   */
  replaceNewLinesAndSanitize(value: string): string {
    return xss.filterXSS(
      value.replace(/(\n|\r\n)/g, this.lineBreak),
      this.xssOptions
    )
  }

  /**
   * returns {
   *    variables - extracted param variables from template
   *    tokens - tokenised strings that can be joined to produce a template
   * }
   * @param templateBody - template body
   * @param params - dict of param variables used for interpolation
   */
  parseTemplate(
    templateBody: string,
    params?: { [key: string]: string }
  ): {
    variables: Array<string>
    tokens: Array<string>
  } {
    const variables: Set<string> = new Set()
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

          // only allow alphanumeric, underscore template, prevents code execution
          const keyHasValidChars = key.match(/\W/) === null
          if (!keyHasValidChars) {
            throw new TemplateError(
              `Invalid characters in the keyword: {{${key}}}.\nCheck that the keywords only contain letters, numbers and underscore.\nKeywords like {{ Person-Name }} are not allowed, but {{ Person_Name }} is allowed.`
            )
          }

          // add key regardless, note that this is also returned in lowercase
          variables.add(key)

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
        variables: Array.from(variables), // variables are unique
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
          "Check that the keywords only contain letters, numbers and underscore.\nKeywords like {{ Person's Name }} are not allowed, but {{ Person_Name }} is allowed."
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
  template(
    templateBody: string,
    params: { [key: string]: string },
    config?: Partial<TemplatingConfig>
  ): string {
    const configWithDefaults = { ...TemplatingConfigDefault, ...config }
    const preProcessed = this.preProcessTemplate(
      templateBody,
      configWithDefaults
    )
    const parsed = this.parseTemplate(preProcessed, params)
    // Remove extra '\' infront of single quotes and backslashes, added by Squirrelly when it escaped the csv.
    // Remove extra '\' infront of \n added by Squirrelly when it escaped the message body.
    const templated = parsed.tokens
      .join('')
      .replace(/\\([\\'])/g, '$1')
      .replace(/\\n/g, '\n')
    const filtered = xss.filterXSS(templated, this.xssOptions)
    return this.postProcessTemplate(filtered, configWithDefaults)
  }

  preProcessTemplate(template: string, options: TemplatingConfig): string {
    let result = template
    /*
     * removeEmptyLinesFromTables:
     * Get all text within <table (attr?)> tags
     */
    if (options.removeEmptyLinesFromTables) {
      result = result.replace(
        /<table(\s+.*?|\s*)>(.*?)<\/table\s*>/gs,
        (match) =>
          // Remove all new lines
          match.replace(/(\r\n|\r|\n)/g, '')
      )
    }
    return result
  }

  postProcessTemplate(template: string, options: TemplatingConfig): string {
    const result = template
    if (options.trimEmptyLines) {
      // TODO: Do something
    }
    return result
  }
}
