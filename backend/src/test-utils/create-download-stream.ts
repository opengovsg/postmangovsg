import { Readable } from 'stream'

export function createDownloadStream(
  headers: Array<string>,
  values: Array<Array<string>>
): Readable {
  const head = [headers.join(',')]

  const valuesArray = values.map((v) => v.join(','))
  if (headers.length === 0 && valuesArray.length === 0)
    return Readable.from('invalid')
  const data = head.concat(valuesArray)

  return Readable.from(data.join('\n'))
}
