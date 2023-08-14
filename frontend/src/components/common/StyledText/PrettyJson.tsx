interface PrettyJsonProps {
  json: Record<string, string>
}

const prettyJsonStyle = { display: 'block' }

export const PrettyJson = ({ json }: PrettyJsonProps) => {
  const keys = Object.keys(json)
  keys.sort()

  return (
    <div>
      {keys.map((key) => (
        <span key={key} style={prettyJsonStyle}>
          {key}: {json[key]}
        </span>
      ))}
    </div>
  )
}
