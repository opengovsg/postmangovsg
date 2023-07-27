import { z } from 'zod'

export const IS_LOCAL = process.env.IS_LOCAL === 'true'

const envVars = z.object({
  IS_LOCAL: z.string(),
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ProcessEnv extends z.infer<typeof envVars> {}
  }
}
