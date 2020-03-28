const checkRequiredEnvVars = (vars: Array<string>): boolean => {
  vars.forEach(v => {
    if (!process.env[v]) {
      console.log(`${v} environment variable is not set!`)
      throw new Error(`${v} environment variable is not set!`)
    }
  })
  return true
}

export { checkRequiredEnvVars }
export * from './config'
export * from './loaders'