interface PrettyJsonProps {
  json: Record<string, string>
}

const prettyJsonStyle = { display: 'block' }

export const PrettyJson = ({ json }: PrettyJsonProps) => {
  return (
    <div>
      {Object.keys(json).map((key) => (
        <span key={key} style={prettyJsonStyle}>
          {key}: {json[key]}
        </span>
      ))}
    </div>
  )
}
