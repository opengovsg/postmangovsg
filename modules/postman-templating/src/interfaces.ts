export interface TemplatingConfig {
  /**
   * Trim consecutive empty lines in the template. This is useful to prevent empty
   * lines when there are optional keywords to replace. To preserve empty lines, use `<p></p>`
   * Default: false
   */
  trimEmptyLines: boolean

  /**
   * Empty lines inside <table> tags will replaced with <br>, it will be hoisted to
   * the top of the table.
   * Default: false
   */
  removeEmptyLinesFromTables: boolean
}

export const TemplatingConfigDefault: TemplatingConfig = {
  trimEmptyLines: false,
  removeEmptyLinesFromTables: false,
}
