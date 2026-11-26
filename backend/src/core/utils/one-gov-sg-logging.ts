export const isOneGovSgCallbackPath = (path: string): boolean =>
  /^\/v1\/auth\/one-gov-sg\/callback\/?$/i.test(path)
