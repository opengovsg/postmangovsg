import { SSTConfig } from 'sst'

import { LoggingStack } from './stacks/LoggingStack'
import { MyStack } from './stacks/MyStack'

export default {
  config(_input) {
    return {
      name: 'postmangovsg-sst',
      region: 'ap-southeast-1',
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      nodejs: {
        sourcemap: true,
      },
    })
    app.stack(MyStack)
    if (app.stage === 'stg' || app.stage === 'prod') app.stack(LoggingStack)
  },
} satisfies SSTConfig
