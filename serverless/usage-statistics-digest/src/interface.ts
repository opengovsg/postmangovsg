// TODO

export interface Cronitor {
  run: () => Promise<void>
  complete: () => Promise<void>
  fail: (message?: string) => Promise<void>
}
