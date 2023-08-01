interface PrettyJsonProps {
  json: Record<string, string>
}

export const PrettyJson = ({ json }: PrettyJsonProps) => {
  return (
    <div>
      {Object.keys(json).map((key) => (
        <span key={key} style={{ display: 'block' }}>
          {key}: {json[key]}
        </span>
      ))}
    </div>
  )
}
