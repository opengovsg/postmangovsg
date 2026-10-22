import { SSTConfig } from 'sst'

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
      runtime: 'nodejs22.x',
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      nodejs: {
        sourcemap: true,
      },
    })
    app.stack(MyStack)
  },
} satisfies SSTConfig
