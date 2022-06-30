/**
 * This file consists of functions that handles html pasted by users into our rich text editor.
 * As our rich text editor uses draftjs components, we need to convert the html pasted into
 * draftjs blocks. This is done by parsing the html elements and having custom conversion according
 * to our existing draft object types.
 *
 * We support pasting of elements and styles that are controllable by our current toolbar:
 *      - bold
 *      - italics
 *      - underline
 *      - text styles: h1, h2, h4, (normal as default)
 *      - alignment: left, right, centre, justify
 *      - list: unordered, ordered
 *      - link
 *      - table: simple table without nesting or merged cells
 * We do not support the following even though they are controllable by our toolbar:
 *      - color
 *          - our rich text editor doesn't use conventional color names
 *          - there is currently no urgent need
 *      - images
 *          - automated uploading of images isn't a feature yet
 *
 * FUNCTIONS:
 *
 * This file exports addHtmlToDocument(newHtml: string, currentEditorState: EditorState)
 * which is used by handlePastedText in the rich editor.
 * The main code trace is as follows
 * - addHtmlToDocument()
 *      - convertHtmlToEditorState()
 *          - stateFromHTML(... , stateFromHtmlOptions)
 *
 */

import { EditorState, ContentBlock, ContentState, Modifier } from 'draft-js'

import { stateFromHTML } from 'draft-js-import-html'
import { filterEditorState } from 'draftjs-filters'

/**
 * Converts style attribute string into key-value pairs
 * @param style style attribute
 * @returns dict of style attribute
 */
function convertStyleStringToObject(style: string): { [id: string]: string } {
  if (!style) {
    return {}
  }
  const data = {}
  return style
    .split(';')
    .filter((s) => s.includes(':'))
    .map((s) => s.split(':'))
    .reduce((map, s) => {
      const key = s?.shift()?.trim()
      const val = s.join(':').trim()
      if (!key) return map
      ;(map as any)[key] = val
      return map
    }, data)
}

/**
 * Converts list from word document which uses the MsoList class
 * @param element html list element
 * @param styleDict style attributes of the list
 * @returns type of list and depth of item
 */
function MsoListConversion(
  element: Element,
  styleDict: { [id: string]: string }
) {
  // reads indent level of list item from its style
  const listStyle = styleDict['mso-list']
  const level = listStyle.split('level')[1].split(' ')[0] || '1'
  const data = { level: parseInt(level) }
  // reads ordered/unordered from attribute added during html parsing
  if (element.getAttribute('ordered') === 'y') {
    return { type: 'ordered-list-item', data }
  }
  return { type: 'unordered-list-item', data }
}

/**
 * Converts list wrapped in li tags which google doc uses
 * @param element html list element
 * @returns type of list and depth of item
 */
function liTagListConversion(element: Element) {
  const ordered = element.parentElement?.tagName === 'OL'
  const level = element.getAttribute('aria-level') || 1
  const data = { level: level }
  if (ordered) {
    return { type: 'ordered-list-item', data }
  }
  return { type: 'unordered-list-item', data }
}

/**
 * Converts table to draftjs data struct
 * - don't render table if it contains a nested table or merged cells
 * - insert a non-breaking space for empty elements
 * - populate data of each table cell and return
 * @param element html list element
 * @returns
 * - if table cell is rendered:
 *    type: 'table-cell'
 *    data: {
 *      rows: number of rows in the table
 *      cols: number of cols in the table
 *      row: row in which the cell is at (index from 0)
 *      col: col in which the cell is at (index from 0)
 *    }
 * - if table is not rendered:
 *    type: 'unstyled'
 *    data: {}
 */
function tableConversion(element: Element) {
  let data = {}
  const tableEl = element.closest('table')
  const tableRows = tableEl?.querySelectorAll('tr')
  if (!tableRows) return { type: 'unstyled', data }

  // If this table has a nested table within it
  // don't render the outer table or Draft-js will crash
  if (tableEl?.querySelector('table')) return { type: 'unstyled', data }

  // Dont render the table if it has merged cells
  const tableCells = tableEl?.querySelectorAll('td') || []
  for (let i = tableCells.length - 1; i >= 0; i--) {
    if (
      tableCells[i].getAttribute('rowspan') ||
      tableCells[i].getAttribute('colspan')
    ) {
      return { type: 'unstyled', data }
    }
  }

  // empty elements get ignored and can break a table, replace unrendered characters,
  // ensure at minimum there is an non-breaking space
  if (element.textContent?.replace(/\s/g, '') === '') {
    element.innerHTML = '&nbsp;'
  }

  // populate data
  let found = false
  for (let i = 0, rows = tableRows, rowCount = rows.length; i < rowCount; i++) {
    for (
      let j = 0, cells = rows[i].children, colCount = cells.length;
      j < colCount;
      j++
    ) {
      if (cells[j] === element) {
        data = {
          rows: rowCount,
          cols: colCount,
          row: i,
          col: j,
        }
        found = true
        break
      }
    }
    if (found) break
  }
  return { type: 'table-cell', data }
}

/**
 * Custom functions to converts html into draft.js data structure state
 */
const stateFromHtmlOptions: any = {
  /**
   * Converts custom block to draft data struct
   * @param element html element
   * @returns type of block and its metadata
   */
  customBlockFn: (element: any) => {
    // filter for specific styles to store in data
    const style = element.getAttribute('style') || ''
    const styleDict = convertStyleStringToObject(style) || {}
    const data = Object.fromEntries(
      Object.entries(styleDict).filter(([k, _v]) => ['text-align'].includes(k))
    ) as { [id: string]: any }

    // empty elements get ignored, ensure there is a non-breaking space
    if (['P'].includes(element.tagName)) {
      if (element.textContent === '') {
        element.innerHTML = '&nbsp;'
      }
    }

    // list handling (word doc)
    if (styleDict['mso-list']) {
      return MsoListConversion(element, styleDict)
    }

    // list handling of li tags (google docs)
    if (element.tagName === 'LI') {
      return liTagListConversion(element)
    }

    //table handling
    if (element.tagName === 'TD') {
      return tableConversion(element)
    }
    return { data }
  },
}

/**
 * Change html tag of an element
 * @param element html element
 * @param tag desired html tag
 * @returns state with list depth adjusted
 */
function changeTag(element: Element, tag: string) {
  // prepare the elements
  const newElem = document.createElement(tag)
  const clone = element.cloneNode(true) as Element
  // move the children from the clone to the new element
  while (clone.firstChild) {
    newElem.appendChild(clone.firstChild)
  }
  // copy the attributes
  const attrs = clone.attributes
  for (let i = attrs.length - 1; i >= 0; i--) {
    newElem.setAttribute(attrs[i].name, attrs[i].value)
  }
  return newElem
}

/**
 * modify DOM tree for table
 * - inserts a new line before table if table is the first element
 * - If a nested table has a single row and cell,
 * switch it to a span as a single cell's contents of the outer table
 * @param node table element
 * @param isNestedBlock if block is nested
 * @returns modified node
 */
function modifyTableDOM(node: Element, isNestedBlock: boolean): Element {
  if (!node.previousElementSibling) {
    const newNode = document.createElement('p')
    node.parentNode?.insertBefore(newNode, node)
  }

  // Render content of single cell nested table directly
  if (isNestedBlock) {
    const cells = node?.querySelectorAll('td')
    if (cells.length === 1) {
      let cell = cells[0] as Element
      if (
        cell &&
        cell.firstElementChild &&
        ['DIV', 'P'].includes(cell.firstElementChild.tagName)
      ) {
        cell = cell.firstElementChild
      }
      if (cell) {
        // discard the table wrap and
        // obtain the element with cell content as span
        const newNode = changeTag(cell, 'span')
        node.replaceWith(newNode)
        node = newNode
      }
    }
  }
  return node
}

/**
 * sets the ordered attribute of list items to y/n
 * - find the first child which represents the bullet point symbol
 *    y if bullet point contains alphanumeric followed by a '.'
 *    n otherwise
 * - removes this bullet point element after reading so that the converter
 * doesn't pick up the symbol as a list text content
 * @param node list element
 * @returns
 */
function setListOrderedAttribute(node: Element) {
  // check for existence of element that contains the bullet point
  if (node.firstElementChild && node.firstElementChild.textContent) {
    const ordered = /[A-Za-z0-9]*?\./.test(node.firstElementChild.textContent)
    if (ordered) {
      node.setAttribute('ordered', 'y')
    } else {
      node.setAttribute('ordered', 'n')
    }
    node.removeChild(node.firstElementChild)
  }
}

/**
 * Recursive function to walk the full DOM tree, making modifications as needed to
 * preserve formatting during conversion to internal state for draft.js
 * - Finds block-level tags (div, p) inside <li> list items and <td> table cells
 * and converts them to inline <span> elements, otherwise the div & p tags would take
 * precedence and the list or table structure gets lost in the conversion.
 * - Sets an 'ordered' attribute for list items so that the converter knows whether lists are ordered
 * - Modifies DOM for table for clean representation
 * @param node element to traverse
 * @param isNestedBlock whether node is nested
 * @returns
 */
function traverse(node: Element, isNestedBlock: boolean) {
  if (!node) return

  // replace block elements inside lists and table cells with inline <span> elements
  if (isNestedBlock && ['DIV', 'P'].includes(node.tagName)) {
    const newNode = changeTag(node, 'span')
    node.replaceWith(newNode)
    node = newNode
  }

  const style = node.getAttribute('style') || ''
  const styleDict = convertStyleStringToObject(style) || {}
  if (styleDict['mso-list']) setListOrderedAttribute(node)

  if (node.tagName === 'TABLE') node = modifyTableDOM(node, isNestedBlock)

  if (node.nextElementSibling) traverse(node.nextElementSibling, isNestedBlock)
  const isFirstElemNested =
    isNestedBlock || node.tagName === 'LI' || node.tagName === 'TD'
  if (node.firstElementChild) {
    traverse(node.firstElementChild, isFirstElemNested)
  }
}

/**
 * Removes <style> tags if any
 * @param parsedHtml html parsed by DOMParser
 * @returns parsed html without style tags
 */
function removeStyleTags(parsedHtml: HTMLBodyElement): HTMLBodyElement {
  let child = parsedHtml.firstChild as Element

  while (child) {
    if (child.tagName === 'STYLE') {
      const nextChild = child.nextSibling as Element
      parsedHtml.removeChild(child)
      child = nextChild
      continue
    }
    child = child?.nextSibling as Element
  }
  return parsedHtml
}

/**
 * Cleans html
 * - parse html using DOMParser
 * - removes <style> tags if any
 * - traverse the DOM tree, making modification to prepare for conversion to draft state
 *    - refer to traverse function header
 * - converts back to html string and adds a line break
 * @param newHtml html of pasted text
 * @returns cleaned html
 */
function cleanHtml(newHtml: string): string {
  const domParser = new DOMParser()
  const tempDoc = domParser.parseFromString(newHtml, 'text/html')
  let parsedHTML = tempDoc.querySelector('body')
  if (!parsedHTML) return ''

  parsedHTML = removeStyleTags(parsedHTML)

  if (parsedHTML.firstElementChild) {
    traverse(parsedHTML.firstElementChild, false)
  }

  const s = new XMLSerializer()
  const cleanedHtml = s.serializeToString(parsedHTML).concat('<p></p>')

  return cleanedHtml
}

/**
 * Filter state to only keep items that our rich text editor supports
 * Only render things that are controllable by our toolbar
 * @param newEditorState editor state to filter
 * @returns filtered state
 */
function filterState(newEditorState: EditorState): EditorState {
  return filterEditorState(
    {
      blocks: [
        'header-one',
        'header-two',
        'header-four',
        'table-cell',
        'ordered-list-item',
        'unordered-list-item',
      ],
      styles: ['BOLD', 'ITALIC', 'UNDERLINE'],
      entities: [
        {
          type: 'LINK',
          attributes: ['url'],
        },
      ],
      maxNesting: 5,
      whitespacedCharacters: [],
    },
    newEditorState
  )
}

/**
 * Adjusts depth of list items
 * - reads depth from data.level and sets block depth
 * - data.level represents the item depth and was populated during custom block conversion
 * @param newEditorState editor state to adjust depth
 * @returns state with list depth adjusted
 */
function adjustListDepth(newEditorState: EditorState): EditorState {
  const curContent = newEditorState.getCurrentContent()
  const newBlocks = curContent.getBlocksAsArray()
  let blockMap = curContent.getBlockMap()

  // sets depth to data.level -1 as depth is indexed from 0 while level was indexed from 1
  newBlocks.forEach((block) => {
    if (
      ['ordered-list-item', 'unordered-list-item'].includes(block.getType())
    ) {
      const blockKey = block.getKey()
      const level = block.getData().get('level') - 1
      const newBlock = block.set('depth', level) as ContentBlock
      blockMap = blockMap.set(blockKey, newBlock)
    }
  })

  // update editor state with new block map
  const newContent = curContent.set('blockMap', blockMap) as ContentState
  newEditorState = EditorState.push(newEditorState, newContent, 'adjust-depth')

  return newEditorState
}

/**
 * 1. Removes white space on new line (clean up of our newline parsing)
 * We previously inserted a white space on every new line as empty lines get ignored,
 * hence we are removing these extra white spaces.
 * 2. Removes redundant table cells (clean up of our table parsing)
 * Redundant table cells may created if there exists multiple children within <td>
 * These cells are broken without the correct data fields and hence we remove them.
 * @param newEditorState editor state to clean up
 * @returns state with redundant white spaces and cells removed
 */
function cleanupNewLineAndTable(newEditorState: EditorState): EditorState {
  const curContent = newEditorState.getCurrentContent()
  const newBlocks = curContent.getBlocksAsArray()
  let blockMap = curContent.getBlockMap()

  // check for lines with white spaces and remove them
  newBlocks.forEach((block) => {
    const blockKey = block.getKey()
    if (block.getType() === 'unstyled') {
      const text = block.getText()
      if (/^\s*$/.test(text)) {
        const newBlock = block.set('text', '') as ContentBlock
        blockMap = blockMap.set(blockKey, newBlock)
      }
    } else if (
      block.getType() === 'table-cell' &&
      !block.getData().get('rows')
    ) {
      blockMap = blockMap.remove(blockKey)
    }
  })

  // update editor state with new block map
  const newContent = curContent.set('blockMap', blockMap) as ContentState
  newEditorState = EditorState.push(
    newEditorState,
    newContent,
    'delete-character'
  )

  return newEditorState
}

/**
 * Post processing of editor state created
 * - filter state to only keep items that our rich text editor supports
 * - adjusts depth of list items
 * - correct the rendering of new lines and table cells
 * @param newEditorState editor state to process
 * @returns processed state
 */
function statePostProcessing(newEditorState: EditorState): EditorState {
  newEditorState = filterState(newEditorState)
  newEditorState = adjustListDepth(newEditorState)
  newEditorState = cleanupNewLineAndTable(newEditorState)
  return newEditorState
}

/**
 * Converts html to draft editor state
 * - cleans html
 * - creates state from parsed html
 * - filter and adjust depth of state created
 * @param newHtml html of pasted text
 * @returns Editor state of the new content
 */
function convertHtmlToEditorState(newHtml: string): EditorState {
  const cleanedHtml = cleanHtml(newHtml)
  let newEditorState = EditorState.createWithContent(
    stateFromHTML(cleanedHtml, stateFromHtmlOptions)
  )
  newEditorState = statePostProcessing(newEditorState)
  return newEditorState
}

/**
 * Updates editor state with newly pasted html content
 * - converts html to draft editor state by caling convertHtmlToEditorState
 * - replaces selected content with pasted content
 * - pushes new content to editor state
 * @param newHtml html of pasted text
 * @param currentEditorState editor state before handling paste
 * @returns new editor state
 */
export function addHtmlToState(
  newHtml: string,
  currentEditorState: EditorState
): EditorState {
  // converts html to draft editor state
  let newEditorState = convertHtmlToEditorState(newHtml)

  // replaces selected content with pasted content
  const newBlockMap = newEditorState.getCurrentContent().getBlockMap()
  const newContent = Modifier.replaceWithFragment(
    currentEditorState.getCurrentContent(),
    currentEditorState.getSelection(),
    newBlockMap
  )

  // pushes new content to editor state
  newEditorState = EditorState.push(
    currentEditorState,
    newContent,
    'insert-fragment'
  )
  return newEditorState
}
