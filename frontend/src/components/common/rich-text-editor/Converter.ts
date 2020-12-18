import {
  RawDraftContentState,
  RawDraftContentBlock,
  RawDraftInlineStyleRange,
  RawDraftEntityRange,
  RawDraftEntity,
} from 'draft-js'
import { orderBy, findIndex } from 'lodash'

import { HTMLTree } from './HTMLTree'

interface DraftEntityMap {
  [key: string]: RawDraftEntity<{ [key: string]: any }>
}

type TagType = 'strong' | 'em' | 'ins' | 'span' | 'a' | 'img' | 'ul' | 'ol'

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
  BOLD: 'strong',
  ITALIC: 'em',
  UNDERLINE: 'ins',
}

const ENTITY_MAPPING: Record<string, TagType> = {
  IMAGE: 'img',
  LINK: 'a',
}

const LIST_WRAPPER: Record<string, TagType> = {
  'unordered-list-item': 'ul',
  'ordered-list-item': 'ol',
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
    }

    return `${attrStr} ${key}="${value}"`
  }, '')
}

const renderTag = (htmlTag: HTMLTag): string => {
  const { attr, tag, type } = htmlTag
  const attrStr = getAttrStr(attr)

  switch (tag) {
    case 'img':
      return `<${tag}${attrStr} />`
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
  const characters = text.split('')
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
      tree.insert({ tag: 'table' })
      const tbody = tree.insertChild({ tag: 'tbody' })
      tree.select(tbody)

      const tr = tree.insertChild({ tag: 'tr' })
      tree.select(tr)
    } else {
      const { cols, row, col } = currBlock.data as Record<string, number>
      const startRow = (row * (cols + 1) + col) % (cols + 1) === 0
      if (startRow) {
        const parent = tree.active?.parent
        if (parent) {
          tree.select(parent)
          const tr = tree.insertChild({ tag: 'tr' })
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

    if (isListItem(currBlock) || isTableCell(currBlock)) {
      tree.insertChild({ tag, content })
    } else {
      tree.insert({ tag, content })
    }

    prevBlock = currBlock
  }

  return tree.toHTML()
}

export const Converter = { convertToHTML }
