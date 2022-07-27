export const waitForMs = (ms: number): Promise<void> => {
  if (ms > 0) return new Promise((resolve) => setTimeout(resolve, ms))
  return Promise.resolve()
}
