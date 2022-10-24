import type { PropsWithChildren } from 'react'
import { ContentBlock, ContentState, DraftDecorator } from 'draft-js'

const HIGHLIGHT_REGEX = /{{\s*?\w+\s*?}}/g

const variableStrategy = (
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void,
  _contentState: ContentState
): void => {
  const text = contentBlock.getText()
  let matchArr, start
  while ((matchArr = HIGHLIGHT_REGEX.exec(text)) !== null) {
    start = matchArr.index
    callback(start, start + matchArr[0].length)
  }
}

const VariableSpan = (props: PropsWithChildren<any>) => {
  return <mark>{props.children}</mark>
}

export const VariableDecorator: DraftDecorator = {
  strategy: variableStrategy,
  component: VariableSpan,
}
