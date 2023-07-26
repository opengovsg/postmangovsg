import { SSTConfig } from 'sst'

import { Crons } from './stacks/Crons'
import { Padding } from './stacks/Padding'

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
    app.stack(Crons)
    app.stack(Padding)
  },
} satisfies SSTConfig
