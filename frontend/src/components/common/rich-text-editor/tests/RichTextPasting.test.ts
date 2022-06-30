/**
 * This file runs unit tests on the text editor's paste handling function
 * when rich text is pasted in html.
 * We test the function addHtmlToState(html, EditorState) which takes in the
 * pasted html and current editor state, and returns a new editor state.
 * Tests are run for each style/ item we preserve on paste,
 * using html copied from word doc and an empty editor state.
 * We then verify that the new editor state is as expected by checking the
 * html generated from the new editor state.
 */

import { readFileSync } from 'fs'

import { EditorState, convertToRaw } from 'draft-js'

import { addHtmlToState } from '../RichTextPasting'
import { Converter } from '../utils'

const testFileDir = __dirname.concat('/../test-utils/htmlFromWord/')
const fileNames = [
  'bold.txt',
  'italics.txt',
  'underline.txt',
  'strike.txt',
  'headerOne.txt',
  'headerTwo.txt',
  'headerFour.txt',
  'alignLeft.txt',
  'alignRight.txt',
  'alignCenter.txt',
  'alignJustify.txt',
  'unorderedList.txt',
  'orderedList.txt',
  'link.txt',
  'table.txt',
  'tableNestedSingleCell.txt',
  'tableNested.txt',
  'tableMerged.txt',
]

const testNames = [
  'bold',
  'italics',
  'underline',
  'no strikethrough',
  'header one',
  'header two',
  'header four',
  'align left',
  'align right',
  'align center',
  'align justify',
  'unordered list',
  'ordered list',
  'link',
  'table',
  'table: unwrap nested single cell table',
  'table: only render nested table',
  'table: do not render table with merged cells',
]

const htmlToExpect = [
  '<p><b>test</b></p><p></p>',
  '<p><i>test</i></p><p></p>',
  '<p><u>test</u></p><p></p>',
  '<p>test</p><p></p>',
  '<h1>test</h1><p></p>',
  '<h2>test</h2><p></p>',
  '<h4>test</h4><p></p>',
  '<p>test</p><p></p>',
  '<p style="text-align: right;">test</p><p></p>',
  '<p style="text-align: center;">test</p><p></p>',
  '<p style="text-align: justify;">test</p><p></p>',
  '<ul><li>test1<ul><li>test1.1</li><li>test1.2<ul><li>test1.2.1</li></ul></li></ul></li><li>test2<ul><li>test2.1</li><li>test2.2<ul><li>test2.2.1</li></ul></li></ul></li></ul><p></p>',
  '<ol><li>test1<ol><li>test1.1</li><li>test1.2<ol><li>test1.2.1</li></ol></li></ol></li><li>test2<ol><li>test2.1</li><li>test2.2<ol><li>test2.2.1</li></ol></li></ol></li></ol><p></p>',
  '<p><a href="https://www.google.com/">test</a></p><p></p>',
  '<p></p><table style="border: solid 1px #b5c4ff; border-collapse: collapse; min-width: 50%;"><tbody><tr style="border: solid 1px #b5c4ff;"><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.1</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.2</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.3</td></tr><tr style="border: solid 1px #b5c4ff;"><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.1</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.2</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.3</td></tr></tbody></table><p></p>',
  '<p></p><table style="border: solid 1px #b5c4ff; border-collapse: collapse; min-width: 50%;"><tbody><tr style="border: solid 1px #b5c4ff;"><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.1</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.2</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test1.3</td></tr><tr style="border: solid 1px #b5c4ff;"><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.1</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.2</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 33.333%;">test2.3.outer test2.3.inner</td></tr></tbody></table><p></p>',
  '<p></p><p>test1.1</p><p>test1.2</p><table style="border: solid 1px #b5c4ff; border-collapse: collapse; min-width: 50%;"><tbody><tr style="border: solid 1px #b5c4ff;"><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 50.000%;">test1.2.1</td><td style="border: solid 1px #b5c4ff; padding: 0.5rem; width: 50.000%;">test1.2.2</td></tr></tbody></table><p>test1.3</p><p>test2.1</p><p>test2.2</p><p>test2.3</p><p></p>',
  '<p></p><p>test1.1</p><p>test1.2</p><p>test1.3</p><p>test2.2</p><p>test2.3</p><p></p>',
]

for (let i = 0; i < testNames.length; i++) {
  test(testNames[i], () => {
    const input = readFileSync(testFileDir.concat(fileNames[i]), 'utf-8')
    const emptyEditorState = EditorState.createEmpty()
    const result = addHtmlToState(input, emptyEditorState)
    const htmlResult = Converter.convertToHTML(
      convertToRaw(result.getCurrentContent())
    )
    expect(htmlResult).toBe(htmlToExpect[i])
  })
}
