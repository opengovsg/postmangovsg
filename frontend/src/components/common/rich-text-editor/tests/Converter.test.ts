import { RawDraftContentState } from 'draft-js'

import { Converter } from '../utils'

const LINK = {
  type: 'LINK',
  mutability: 'MUTABLE' as const,
  data: { url: 'https://example.com', targetOption: '_blank' },
}
const A = '<a href="https://example.com" target="_blank">'

const paragraph = (
  text: string,
  styles: { offset: number; length: number; style: string }[],
  links: { offset: number; length: number }[]
): RawDraftContentState => ({
  blocks: [
    {
      key: 'k1',
      text,
      type: 'unstyled',
      depth: 0,
      inlineStyleRanges: styles as any,
      entityRanges: links.map((l) => ({ ...l, key: 0 })),
      data: {},
    },
  ],
  entityMap: links.length > 0 ? { 0: LINK } : {},
})

// Every closing tag must match the innermost open tag, like a strict parser expects.
const isWellNested = (html: string): boolean => {
  const stack: string[] = []
  const re = /<(\/?)([a-z]+)[^>]*?(\/?)>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const [, closing, tag, selfClosing] = m
    if (selfClosing || tag === 'br') continue
    if (!closing) stack.push(tag)
    else if (stack.pop() !== tag) return false
  }
  return stack.length === 0
}

describe('Converter.convertToHTML inline styles and links', () => {
  test('keeps bold on a fully linked word', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'Click here',
        [{ offset: 6, length: 4, style: 'BOLD' }],
        [{ offset: 6, length: 4 }]
      )
    )
    expect(html).toContain(`Click ${A}<b>here</b></a>`)
    expect(isWellNested(html)).toBe(true)
  })

  test('keeps italic on part of a link', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'see docs now',
        [{ offset: 4, length: 2, style: 'ITALIC' }],
        [{ offset: 4, length: 4 }]
      )
    )
    expect(html).toContain(`see ${A}<i>do</i>cs</a> now`)
    expect(isWellNested(html)).toBe(true)
  })

  test('link and style start on the same character but end apart', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'abcdef',
        [{ offset: 0, length: 4, style: 'BOLD' }],
        [{ offset: 0, length: 2 }]
      )
    )
    expect(html).toContain(`${A}<b>ab</b></a><b>cd</b>ef`)
    expect(isWellNested(html)).toBe(true)
  })

  test('style starts before the link and both end on the same character', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'abcdef',
        [{ offset: 0, length: 4, style: 'BOLD' }],
        [{ offset: 2, length: 2 }]
      )
    )
    expect(html).toContain(`<b>ab${A}cd</a></b>ef`)
    expect(isWellNested(html)).toBe(true)
  })

  test('link ends inside a style that keeps going', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'abcdef',
        [{ offset: 1, length: 4, style: 'UNDERLINE' }],
        [{ offset: 0, length: 3 }]
      )
    )
    expect(html).toContain(`${A}a<u>bc</u></a><u>de</u>f`)
    expect(isWellNested(html)).toBe(true)
  })

  test('several styles and a link ending at the end of the text', () => {
    const html = Converter.convertToHTML(
      paragraph(
        'abc',
        [
          { offset: 0, length: 3, style: 'BOLD' },
          { offset: 1, length: 2, style: 'ITALIC' },
        ],
        [{ offset: 1, length: 2 }]
      )
    )
    expect(isWellNested(html)).toBe(true)
    expect(html).toMatch(/<b>a.*bc.*<\/b>/)
  })
})
