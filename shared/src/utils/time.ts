export const waitForMs = (ms: number): Promise<void> => {
  if (ms > 0) return new Promise((resolve) => setTimeout(resolve, ms))
  return Promise.resolve()
}

export const millisecondsToMinSecString = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0)
  return `${minutes > 0 ? `${minutes} min ` : ''}${seconds} s`
}
