const checkRequiredEnvVars = (vars: Array<string>): boolean => {
  vars.forEach(v => {
    if (!process.env[v]) {
      // do not use winston logger here since we may require certain env vars for logger in the future
      console.log(`${v} environment variable is not set!`)
      throw new Error(`${v} environment variable is not set!`)
    }
  })
  return true
}

export { checkRequiredEnvVars }
export * from './config'
export * from './loaders'