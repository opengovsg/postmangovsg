export interface TemplatingConfig {
  /**
   * Replaces all new line characters (\n or \r\n) with corresponding line break (e.g. <br />)
   * Default: false
   */
  replaceNewLines: boolean

  /**
   * Trim consecutive empty lines in the template. This is useful to prevent empty
   * lines when there are optional keywords to replace. To preserve empty lines, use `<p></p>`
   * Default: false
   */
  removeEmptyLines: boolean

  /**
   * Empty lines inside <table> tags will replaced with <br> and hoisted to
   * the top of the table.
   * Enable this to remove these line breaks.
   * Default: false
   */
  removeEmptyLinesFromTables: boolean
}

export const TemplatingConfigDefault: TemplatingConfig = {
  replaceNewLines: false,
  removeEmptyLines: false,
  removeEmptyLinesFromTables: false,
}
