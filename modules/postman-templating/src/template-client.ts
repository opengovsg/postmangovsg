import { mapKeys } from 'lodash'
import xss from 'xss'
import { TemplateError } from './errors'
import { TemplatingConfig, TemplatingConfigDefault } from './interfaces'
import { filterImageSources } from './xss-options'

import mustache from 'mustache'

export class TemplateClient {
  xssOptions: xss.IFilterXSSOptions
  lineBreak: string
  allowedImageSources?: Array<string>

  constructor({
    xssOptions,
    lineBreak,
    allowedImageSources,
  }: {
    xssOptions?: xss.IFilterXSSOptions
    lineBreak?: string
    allowedImageSources?: Array<string>
  }) {
    this.xssOptions = xssOptions || {}
    this.lineBreak = lineBreak || '<br />'
    const imageSources = allowedImageSources?.filter((source) => source)

    if (imageSources && imageSources.length > 0) {
      this.xssOptions = filterImageSources(
        this.xssOptions,
        imageSources
      )
    }
  }

  /**
   * Filter XSS
   * @param value Input to be filtered
   */
  filterXSS(value: string): string {
    return xss.filterXSS(value, this.xssOptions)
  }

  /**
   * Removes non-whitelisted html tags
   * Replaces new lines with html <br> so that the new lines can be displayed on the front-end
   * @param value
   */
  replaceNewLinesAndSanitize(value: string): string {
    return this.filterXSS(value.replace(/(\n|\r\n)/g, this.lineBreak))
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

    const dict = mapKeys(params, (_value, key) => key.toLowerCase())
    try {
      const parsed = mustache.parse(templateBody)
      for (const meta of parsed) {
        const tokenType = meta[0]
        const token = meta[1]
        if (tokenType === 'name') {
          const key = token.toLowerCase()

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

          variables.add(key)

          // if no params continue with the loop
          if (!params) continue

          if (dict[key]) {
            const templated = dict[key]
            tokens.push(templated)
            continue
          }

          // recipient key must have param
          if (key === 'recipient') {
            throw new TemplateError(`Param ${key} not found`)
          }
        } else if (tokenType === 'text') {
          tokens.push(token)
        } else {
          throw new TemplateError(
            "Check that the keywords only contain letters, numbers and underscore.\nKeywords like {{ Person's Name }} are not allowed, but {{ Person_Name }} is allowed."
          )
        }
      }

      return {
        variables: Array.from(variables), // variables are unique
        tokens,
      }
    } catch (err) {
      console.error({ message: `${err.stack}` })
      if (err.message.includes('Unclosed tag'))
        throw new TemplateError(
          'Check that all the keywords have double curly brackets around them.\nA correct example is {{ keyword }}, and incorrect ones are {{ keyword } or {{ keyword . '
        )
      // reserved chars in mustache are '^' and '#' and '/'
      if (
        err.message.includes('Unclosed section') ||
        err.message.includes('Unopened section')
      )
        throw new TemplateError(
          "Check that the keywords only contain letters, numbers and underscore.\nKeywords like {{ Person's Name }} are not allowed, but {{ Person_Name }} is allowed."
        )
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
    const filtered = this.filterXSS(templated)
    return this.postProcessTemplate(filtered, configWithDefaults)
  }

  preProcessTemplate(template: string, options: TemplatingConfig): string {
    let result = template
    /**
     * removeEmptyLinesFromTables
     */
    if (options.removeEmptyLinesFromTables) {
      result = result.replace(
        // Get all text within <table (attr?)> tags
        /<table(\s+.*?|\s*)>(.*?)<\/table\s*>/gs,
        (match) =>
          // Remove all new lines
          match.replace(/(\r\n|\r|\n)/g, '')
      )
    }
    if (options.replaceNewLines) {
      result = result.replace(/(\n|\r\n)/g, this.lineBreak)
    }
    return result
  }

  postProcessTemplate(template: string, options: TemplatingConfig): string {
    let result = template
    /**
     * removeEmptyLines
     */
    if (options.removeEmptyLines) {
      // Looks for 2 or more consecutive <br>, <br/> or <br />
      const CONSECUTIVE_LINEBREAK_REGEX = /(\s)*(<br\s*\/?>(\s)*(\n|\r\n)?){2,}/g
      result = result.replace(CONSECUTIVE_LINEBREAK_REGEX, this.lineBreak)
    }
    return result
  }
}
