import cx from 'classnames'

import styles from '../RichTextEditor.module.scss'

interface FontColorControlProps {
  config: any
  currentState: any
  expanded: boolean
  onChange: () => void
  doExpand: () => void
  doCollapse: () => void
  onExpandEvent: () => void
}

const ColorPicker = ({
  colors,
  selected,
  onChange,
}: {
  colors: string[]
  selected: string
  onChange: (key: string, val: string) => void
}) => {
  selected = selected || 'rgb(0,0,0)'
  function handleSelect(color: string) {
    onChange('color', color)
  }

  function isLightColor(rgb: string) {
    const values = rgb.match(/\(([^)]+)\)/)
    if (values && values.length > 0) {
      try {
        const [red, green, blue] = values[1]
          .split(',')
          .map((v) => parseFloat(v))
        const luminance = red * 0.299 + green * 0.587 + blue * 0.114
        return luminance > 200
      } catch (err) {
        return true
      }
    }

    return true
  }

  return (
    <div className={styles.colorPicker}>
      {colors.map((color, i) => (
        <div
          key={i}
          className={cx(styles.swatch, { [styles.light]: isLightColor(color) })}
          onClick={() => handleSelect(color)}
          style={{ backgroundColor: color }}
        >
          {color === selected && <i className="bx bx-check"></i>}
        </div>
      ))}
    </div>
  )
}

export const FontColorControl = (props: FontColorControlProps) => {
  const { currentState, config, expanded, onChange, onExpandEvent } = props
  const { colors } = config
  const { color: selected } = currentState

  return (
    <div className={styles.fontColorControl}>
      <div onClick={() => onExpandEvent()} className="rdw-option-wrapper">
        <i
          className={cx('bx', 'bx-font', styles.fontColorIcon)}
          style={{ borderColor: selected || 'black' }}
        ></i>
      </div>
      {expanded && (
        <ColorPicker selected={selected} colors={colors} onChange={onChange} />
      )}
    </div>
  )
}
