import {
  CharacterMetadata,
  ContentBlock,
  ContentState,
  DraftInlineStyle,
  genKey,
  RawDraftContentBlock,
  RawDraftContentState,
  RawDraftEntity,
  RawDraftEntityRange,
  RawDraftInlineStyleRange,
} from 'draft-js'
import immutable from 'immutable'
import { findIndex, orderBy } from 'lodash'

import { HTMLTree } from './HTMLTree'

interface DraftEntityMap {
  [key: string]: RawDraftEntity<{ [key: string]: any }>
}

type TagType =
  | 'strong'
  | 'em'
  | 'ins'
  | 'span'
  | 'a'
  | 'img'
  | 'ul'
  | 'ol'
  | 'b'
  | 'i'
  | 'u'

interface HTMLTag {
  tag: TagType
  type: 'open' | 'close'
  attr: Record<string, string>
}

const BLOCK_TYPE_MAPPPING: Record<string, string> = {
  unstyled: 'p',
  atomic: 'div',
  'header-one': 'h1',
  'header-two': 'h2',
  'header-three': 'h3',
  'header-four': 'h4',
  'header-five': 'h5',
  'header-six': 'h6',
  'table-cell': 'td',
  'unordered-list-item': 'li',
  'ordered-list-item': 'li',
}

const INLINE_STYLE_MAPPING: Record<string, TagType> = {
  BOLD: 'b',
  ITALIC: 'i',
  UNDERLINE: 'u',
}

const ENTITY_MAPPING: Record<string, TagType> = {
  IMAGE: 'img',
  LINK: 'a',
}

const LIST_WRAPPER: Record<string, TagType> = {
  'unordered-list-item': 'ul',
  'ordered-list-item': 'ol',
}

const TABLE_STYLE = {
  table: {
    border: 'solid 1px #b5c4ff',
    'border-collapse': 'collapse',
    'min-width': '50%',
  },
  row: {
    border: 'solid 1px #b5c4ff',
  },
  cell: {
    border: 'solid 1px #b5c4ff',
    padding: '0.5rem',
  },
}

const getCSS = (style: string): string => {
  const [key, value] = style.split('-')
  let property
  switch (key) {
    case 'bgcolor':
      property = 'background-color'
      break
    default:
      property = key
  }

  return `${property}: ${value};`
}

const getInlineStyleSections = (
  content: string,
  styles: RawDraftInlineStyleRange[]
): number[] => {
  const initialBoundaries = new Set<number>().add(0).add(content.length)
  const boundaries = styles.reduce((indices, val) => {
    const { offset, length } = val
    return indices.add(offset).add(offset + length)
  }, initialBoundaries)

  // TODO: Could probably optimise this if we use a sorted set
  return Array.from(boundaries).sort((a, b) => a - b)
}

const getBlockInlineStyles = (
  content: string,
  styles: RawDraftInlineStyleRange[]
): HTMLTag[][] => {
  // Create an array of size (length + 1) to represent styles to account for closing tag of style on
  // last character of text.
  const styleArray: HTMLTag[][] = Array(content.length + 1)
    .fill('')
    .map(() => [])

  // Return early if there are no styles to process
  if (styles.length < 1) return styleArray

  // Breakdown into contiguous blocks with the same style
  const sections = getInlineStyleSections(content, styles)

  // Check if style should be applied for each section
  for (let i = 0; i < styles.length; i++) {
    const styleRange = styles[i]
    const { offset, length, style } = styleRange

    const tag = INLINE_STYLE_MAPPING[style] || 'span'
    const css = getCSS(style)

    for (let i = 0; i < sections.length - 1; i++) {
      const start = sections[i]
      const end = sections[i + 1]
      const overlaps = start >= offset && end <= offset + length

      // Apply style if section falls within the style range
      if (overlaps) {
        const openTagIndex = findIndex(styleArray[start], { tag, type: 'open' })
        if (openTagIndex < 0) {
          styleArray[start].push({
            tag,
            type: 'open',
            attr: tag === 'span' ? { style: css } : {},
          })
        } else if (tag === 'span') {
          // Merge styles if tag is a span
          const attr = styleArray[start][openTagIndex].attr
          if (attr.style) {
            attr.style = `${attr.style} ${css}`
          } else {
            attr.style = css
          }
        }

        const closeTagIndex = findIndex(styleArray[end], { tag, type: 'close' })
        if (closeTagIndex < 0) {
          styleArray[end].unshift({ tag, type: 'close', attr: {} })
        }
      }
    }
  }

  return styleArray
}

const getBlockEntities = (
  content: string,
  entityRanges: RawDraftEntityRange[],
  entityMap: DraftEntityMap
): HTMLTag[][] => {
  // Create an array of size (length + 1) to represent entities to account for closing tag of style on
  // last character of text.
  const entityArray: HTMLTag[][] = Array(content.length + 1)
    .fill('')
    .map(() => [])

  for (let i = 0; i < entityRanges.length; i++) {
    const entityRange = entityRanges[i]
    const { offset, length, key } = entityRange
    const entity = entityMap[key]

    const tag = ENTITY_MAPPING[entity.type]
    const openTagIndex = findIndex(entityArray[offset], { tag })
    if (openTagIndex < 0) {
      entityArray[offset].push({
        tag,
        type: 'open',
        attr: entity.data,
      })
    } else {
      entityArray[offset][openTagIndex] = {
        tag,
        type: 'open',
        attr: entity.data,
      }
    }

    // No closing tag is required for images
    if (entity.type !== 'IMAGE') {
      const closeTagIndex = findIndex(entityArray[offset + length], { tag })
      if (closeTagIndex < 0) {
        entityArray[offset + length].unshift({ tag, type: 'close', attr: {} })
      }
    }
  }

  return entityArray
}

const getAttrStr = (attrs: Record<string, string>): string => {
  return Object.keys(attrs).reduce((attrStr: string, key: string) => {
    const value = attrs[key]
    // Remap attributes key for links
    switch (key) {
      case 'url':
        key = 'href'
        break
      case 'targetOption':
        key = 'target'
        break
      case 'link':
        key = 'data-link'
        break
    }

    return `${attrStr} ${key}="${value}"`
  }, '')
}

const renderTag = (htmlTag: HTMLTag): string => {
  const { attr, tag, type } = htmlTag
  const attrStr = getAttrStr(attr)

  switch (tag) {
    case 'img':
      return attr.link
        ? `<a href="${attr.link}"><${tag}${attrStr} /></a>`
        : `<${tag}${attrStr} />`
    default:
      return type === 'open' ? `<${tag}${attrStr}>` : `</${tag}>`
  }
}

const sortTags = (arr: HTMLTag[]): HTMLTag[] => {
  // TODO: We wouldn't need this if we used a binary heap / priority queue to store HTMLTag
  const open = orderBy(
    arr.filter((tag) => tag.type === 'open'),
    ['tag']
  )
  const close = orderBy(
    arr.filter((tag) => tag.type === 'close'),
    ['tag'],
    ['desc']
  )

  return close.concat(open)
}

const renderContent = (
  text: string,
  inlineStyles: HTMLTag[][],
  blockEntities: HTMLTag[][]
): string => {
  const characters = text.split('').map((c) => (c === '\n' ? '<br />' : c))
  for (let i = 0; i < characters.length; i++) {
    const styles = inlineStyles[i]
    let tags = ''

    if (styles.length > 0) {
      tags = sortTags(styles).map(renderTag).join('')
    }

    const entities = blockEntities[i]
    if (entities.length > 0) {
      tags = entities.map(renderTag).join('')
    }

    if (tags) {
      characters[i] = `${tags}${characters[i]}`
    }
  }

  // Append closing tags for end of text
  const endStyle = inlineStyles[inlineStyles.length - 1]
  if (endStyle.length > 0) {
    const tags = sortTags(endStyle).map(renderTag).join('')
    characters.push(tags)
  }

  const endEntities = blockEntities[blockEntities.length - 1]
  if (endEntities.length > 0) {
    const tags = endEntities.map(renderTag).join('')
    characters.push(tags)
  }

  return characters.join('')
}

const getBlockContent = (
  block: RawDraftContentBlock,
  entityMap: DraftEntityMap
): string => {
  const { text, entityRanges, inlineStyleRanges } = block

  const inlineStyles = getBlockInlineStyles(text, inlineStyleRanges)
  const blockEntities = getBlockEntities(text, entityRanges, entityMap)

  return renderContent(text, inlineStyles, blockEntities)
}

const isListItem = (block?: RawDraftContentBlock): boolean => {
  return (
    block !== undefined &&
    (block.type === 'unordered-list-item' || block.type === 'ordered-list-item')
  )
}

const startOfList = (
  curr: RawDraftContentBlock,
  prev?: RawDraftContentBlock
): boolean => {
  const startTopLevelList = !isListItem(prev) && isListItem(curr)
  const changeInListDepth =
    prev !== undefined &&
    isListItem(prev) &&
    isListItem(curr) &&
    prev.depth < curr.depth

  return startTopLevelList || changeInListDepth
}

const endOfList = (
  curr: RawDraftContentBlock,
  prev?: RawDraftContentBlock
): boolean => {
  const endTopLevelList = isListItem(prev) && !isListItem(curr)
  const changeInListDepth =
    prev !== undefined &&
    isListItem(prev) &&
    isListItem(curr) &&
    prev.depth > curr.depth

  return endTopLevelList || changeInListDepth
}

const handleList = (
  tree: HTMLTree,
  currBlock: RawDraftContentBlock,
  prevBlock?: RawDraftContentBlock
): void => {
  // Insert list wrapper element if it the start of a list
  if (startOfList(currBlock, prevBlock)) {
    const tag = LIST_WRAPPER[currBlock.type]
    const currentTag = tree.active?.tag

    if (currentTag === 'ul' || currentTag === 'ol') {
      if (tree.active?.children) {
        // Select the last inserted <li> and insert a new list wrapper as a child
        const lastInsertedItem = HTMLTree.getLastChild(tree.active)
        if (lastInsertedItem) {
          tree.select(lastInsertedItem)
          const inserted = tree.insertChild({ tag })
          tree.select(inserted)
        }
      }
    } else {
      tree.insert({ tag })
    }
  }

  // Traverse upwards to parent list
  if (prevBlock && endOfList(currBlock, prevBlock)) {
    const changeInListDepth = prevBlock.depth - currBlock.depth
    for (let d = 0; d < changeInListDepth; d++) {
      const parent = tree.active?.parent
      const grandparent = parent?.parent

      if (grandparent) tree.select(grandparent)
    }
  }
}

const isTableCell = (block?: RawDraftContentBlock): boolean => {
  return block !== undefined && block.type === 'table-cell'
}

const handleTable = (
  tree: HTMLTree,
  currBlock: RawDraftContentBlock,
  prevBlock?: RawDraftContentBlock
): void => {
  if (isTableCell(currBlock)) {
    if (tree.active?.tag !== 'tr') {
      tree.insert({ tag: 'table', style: TABLE_STYLE.table })
      const tbody = tree.insertChild({ tag: 'tbody' })
      tree.select(tbody)

      const tr = tree.insertChild({ tag: 'tr', style: TABLE_STYLE.row })
      tree.select(tr)
    } else {
      const { cols, row, col } = currBlock.data as Record<string, number>
      const startRow = (row * cols + col) % cols === 0
      if (startRow) {
        const table = tree.active?.parent
        if (table) {
          tree.select(table)
          const tr = tree.insertChild({ tag: 'tr', style: TABLE_STYLE.row })
          tree.select(tr)
        }
      }
    }
  }

  if (prevBlock && isTableCell(prevBlock) && !isTableCell(currBlock)) {
    if (tree.root) {
      const lastSibling = HTMLTree.getLastSibling(tree.root)
      if (lastSibling) tree.select(lastSibling)
    }
  }
}

const getBlockStyle = (
  currBlock: RawDraftContentBlock
): Record<string, string> | undefined => {
  let style = {}
  if (currBlock.data) {
    const textAlignment = currBlock.data['text-align']
    if (textAlignment) {
      style = { ...style, 'text-align': textAlignment }
    }
  }

  // Apply default styles for table cells
  if (currBlock.type === 'table-cell') {
    style = { ...style, ...TABLE_STYLE.cell }

    // Ensure that columns are all equally spaced out regardless of content.
    if (currBlock.data && currBlock.data.cols) {
      const width = `${(100 / currBlock.data.cols).toFixed(3)}%`
      style = { ...style, width }
    }
  }

  if (Object.keys(style).length > 0) return style
}

const convertToHTML = (contentState: RawDraftContentState): string => {
  const { blocks, entityMap } = contentState

  const tree = new HTMLTree()
  let prevBlock: RawDraftContentBlock | undefined

  for (let i = 0; i < blocks.length; i++) {
    const currBlock = blocks[i]

    if (isListItem(currBlock) || isListItem(prevBlock)) {
      handleList(tree, currBlock, prevBlock)
    }

    if (isTableCell(currBlock) || isTableCell(prevBlock)) {
      handleTable(tree, currBlock, prevBlock)
    }

    const tag = BLOCK_TYPE_MAPPPING[currBlock.type] || 'div'
    const content = getBlockContent(currBlock, entityMap)
    const style = getBlockStyle(currBlock)

    if (isListItem(currBlock) || isTableCell(currBlock)) {
      tree.insertChild({ tag, content, style })
    } else {
      tree.insert({ tag, content, style })
    }

    prevBlock = currBlock
  }

  let html = tree.toHTML()

  // replace tab with 4 white spaces
  html = html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
  return html
}

const TAG_BLOCK_TYPE_MAPPING: Record<string, string> = {
  p: 'unstyled',
  h1: 'header-one',
  h2: 'header-two',
  h3: 'header-three',
  h4: 'header-four',
  h5: 'header-five',
  h6: 'header-six',
  div: 'atomic',
  td: 'table-cell',
  li: 'list-item',
}

const INLINE_STYLE_TAG_MAPPING: Record<string, string> = {
  b: 'BOLD',
  i: 'ITALIC',
  u: 'UNDERLINE',
}

const getSafeHtmlBody = (htmlStr: string): HTMLElement => {
  // Will not execute script. https://www.w3.org/TR/DOM-Parsing/#widl-DOMParser-parseFromString-Document-DOMString-str-SupportedType-type
  const parser = new DOMParser()
  const html = parser.parseFromString(htmlStr, 'text/html')
  return html.body
}

class ContentBlocksBuilder {
  currentBlockType?: string
  currentEntity: string | null = null
  currentDepth = 0
  currentText = ''
  characterList = immutable.List<CharacterMetadata>()
  currentBlockStyle = immutable.Map<string, string | number>()

  wrapper?: string

  contentBlocks: ContentBlock[] = []
  contentState: ContentState = ContentState.createFromText('')

  tableData?: immutable.Map<string, number> = undefined

  getContentBlocks(): {
    contentBlocks: ContentBlock[]
    entityMap: immutable.OrderedMap<string, any>
  } {
    return {
      contentBlocks: this.contentBlocks,
      entityMap: this.contentState.getEntityMap(),
    }
  }

  createContentBlocks(
    nodes: ChildNode[],
    style: DraftInlineStyle,
    shouldFlush = true
  ) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const nodeName = node.nodeName.toLowerCase()

      if (nodeName === 'table') {
        this.addTable(node)
        continue
      }

      if (nodeName === 'td') {
        this.addTableCell(node)
        continue
      }

      if (nodeName === 'ul' || nodeName === 'ol') {
        this.addList(node)
        continue
      }

      if (nodeName === 'img') {
        this.addImage(node, style)
        continue
      }

      if (nodeName === 'a') {
        this.addLink(node, style)
        continue
      }

      if (nodeName === 'br') {
        this.appendText('\n', style)
        continue
      }

      if (nodeName === '#text') {
        const text = node.textContent
        if (text) this.appendText(text, style)
        continue
      }

      // Handle tag styles
      let newStyle = this.setStylesFromCSS(node, style)
      const inlineStyle = INLINE_STYLE_TAG_MAPPING[nodeName]
      if (inlineStyle) {
        newStyle = newStyle.add(inlineStyle)
      }

      const blockType = TAG_BLOCK_TYPE_MAPPING[nodeName]
      if (blockType) {
        this.currentBlockStyle = this.getBlockStyle(node)
        this.flush()
        this.currentBlockType = blockType
      }

      const children = Array.from(node.childNodes)
      // Because styles are applied as either a span, b, i or u tag, we don't want to flush at the end of
      // an active style. Otherwise a line break is introduced.
      this.createContentBlocks(children, newStyle, newStyle.isEmpty())
    }

    // Flush remaining data to a new block. table-cells and list-items are typically inserted here since
    // there are no nested blocks within them.
    if (shouldFlush) this.flush()

    return this
  }

  flush() {
    // We create a new block if there is already valid block type set
    if (this.currentBlockType) this.makeContentBlock()
  }

  private clear() {
    this.currentBlockType = undefined
    this.currentEntity = null
    this.currentText = ''
    this.currentBlockStyle = immutable.Map()
    this.characterList = immutable.List<CharacterMetadata>()
    this.contentState = ContentState.createFromText('')
  }

  private makeContentBlock(blockData = {}) {
    const key = genKey()
    let type = this.currentBlockType

    // Set specific list type based on wrapper if it is a list-item
    if (type === 'list-item') {
      type = this.wrapper === 'ul' ? 'unordered-list-item' : 'ordered-list-item'
    }

    blockData =
      type === 'table-cell' && this.tableData ? this.tableData : blockData
    const data = immutable
      .Map<string, string | number>(blockData)
      .merge(this.currentBlockStyle)

    const contentBlock = new ContentBlock({
      key,
      type,
      text: this.currentText,
      characterList: this.characterList,
      data,
      depth: this.currentDepth,
    })

    this.contentBlocks.push(contentBlock)
    this.clear()
  }

  private appendText(text: string, style: DraftInlineStyle) {
    // Append text to current text
    this.currentText += text
    // Apply existing style for current text range
    const characterMeta = CharacterMetadata.create({
      style,
      ...(this.currentEntity ? { entity: this.currentEntity } : {}),
    })

    this.characterList = this.characterList.push(
      ...Array(text.length).fill(characterMeta)
    )
  }

  private addLink(node: ChildNode, style: DraftInlineStyle) {
    const link = node as HTMLAnchorElement
    const { target, title } = link

    // Retrieve raw value of href so that link variables will not be escaped
    const el = node as HTMLElement
    const href = el.getAttribute('href')

    // Add entity
    this.contentState = this.contentState.createEntity('LINK', 'MUTABLE', {
      url: href,
      targetOption: target,
      title,
    })

    // Process child nodes with entity set as inserted link
    this.currentEntity = this.contentState.getLastCreatedEntityKey()
    const children = Array.from(node.childNodes)
    // We don't want to flush at the end because that will prevent text after the link from being
    // rendered as the currentBlockType will be set to undefined.
    this.createContentBlocks(children, style, false)

    // Reset entity
    this.currentEntity = null
  }

  private addImage(node: ChildNode, style: DraftInlineStyle) {
    const image = node as HTMLImageElement
    const { src, height, width } = image
    const link = image.getAttribute('data-link')

    this.contentState = this.contentState.createEntity('IMAGE', 'MUTABLE', {
      src,
      height: height > 0 ? height : 'auto',
      width: `${width}%`,
      link,
    })

    this.currentEntity = this.contentState.getLastCreatedEntityKey()
    this.appendText(' ', style)
    this.currentEntity = null
  }

  private addTable(table: ChildNode) {
    // Close off any previous block with text
    this.flush()

    // Get the dimensions of the table
    const tbody = table.childNodes[0]
    if (table.childNodes.length !== 1 && tbody.nodeName !== 'tbody') {
      throw new Error('Invalid table HTML')
    }

    const rows = Array.from(tbody.childNodes).filter(
      (n) => n.nodeName.toLowerCase() === 'tr'
    )

    const numRows = rows.length
    if (numRows < 1) return

    const numCols = Array.from(rows[0].childNodes).filter(
      (n) => n.nodeName.toLowerCase() === 'td'
    ).length

    this.tableData = immutable.Map({
      rows: numRows,
      cols: numCols,
      row: 0,
      col: 0,
    })

    rows.forEach((row, rowIdx) => {
      if (this.tableData) {
        this.tableData = this.tableData.set('row', rowIdx)
      }
      const tableCells = Array.from(row.childNodes)

      tableCells.forEach((cell, colIdx) => {
        if (this.tableData) {
          this.tableData = this.tableData.set('col', colIdx)
        }
        this.createContentBlocks([cell], immutable.OrderedSet())
      })
    })

    this.tableData = undefined
  }

  private addTableCell(cell: ChildNode) {
    this.currentBlockType = 'table-cell'
    const children = Array.from(cell.childNodes)
    this.createContentBlocks(children, immutable.OrderedSet())
  }

  private addList(list: ChildNode) {
    const prevWrapper = this.wrapper
    const prevDepth = this.currentDepth
    this.wrapper = list.nodeName.toLowerCase()

    // Close off previous block first if there was text. This deals with the case when parsing nested list.
    // For example for <li>text<ul>...</ul></li>, we will need to close off the list item holding "text"
    // first before starting the nested list.
    this.flush()

    if (prevWrapper === 'ul' || prevWrapper === 'ol') {
      this.currentDepth++
    }

    list.childNodes.forEach((child) => {
      this.createContentBlocks([child], immutable.OrderedSet())
    })

    this.wrapper = prevWrapper
    if (prevWrapper === 'ul' || prevWrapper === 'ol') {
      this.currentDepth = prevDepth
    }
  }

  private setStylesFromCSS(
    node: ChildNode,
    style: DraftInlineStyle
  ): DraftInlineStyle {
    const { style: cssStyle } = node as HTMLElement
    if (cssStyle) {
      const { color, backgroundColor } = cssStyle
      if (color) style = style.add(`color-${color}`)
      if (backgroundColor) style = style.add(`bgcolor-${backgroundColor}`)
    }

    return style
  }

  private getBlockStyle(node: ChildNode): immutable.Map<string, string> {
    let blockStyle = immutable.Map<string, string>()
    const { style } = node as HTMLElement
    for (let i = 0; i < style.length; i++) {
      const property = style.item(i)
      const value = style.getPropertyValue(property)
      blockStyle = blockStyle.set(property, value)
    }

    return blockStyle
  }
}

const convertFromHTML = (
  html: string
): {
  contentBlocks: ContentBlock[]
  entityMap: immutable.OrderedMap<string, any>
} => {
  const root = getSafeHtmlBody(html)
  let builder = new ContentBlocksBuilder()

  builder = builder.createContentBlocks([root], immutable.OrderedSet())

  // For compatibility with previous templates with text not wrapped in p tags, we flush the text as
  // an unstyled block.
  if (builder.currentText) {
    builder.currentBlockType = 'unstyled'
    builder.flush()
  }

  return builder.getContentBlocks()
}

export const Converter = { convertToHTML, convertFromHTML }
