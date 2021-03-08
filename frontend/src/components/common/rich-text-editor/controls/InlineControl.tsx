import React from 'react'
import cx from 'classnames'

interface InlineControlProps {
  config: any
  currentState: any
  expanded: boolean
  onChange: Function
  doExpand: Function
  doCollapse: Function
  onExpandEvent: Function
}

export const InlineControl = (props: InlineControlProps) => {
  const { config, currentState, onChange } = props
  const { options } = config

  return (
    <div className="rdw-inline-wrapper">
      {options.map((style: string, i: number) => (
        <div
          key={i}
          onClick={() => onChange(style)}
          className={cx('rdw-option-wrapper', {
            'rdw-option-active': currentState[style] === true,
          })}
        >
          <i className={`bx bx-${style}`}></i>
        </div>
      ))}
    </div>
  )
}
