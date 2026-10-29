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
      // nodejs22.x no longer trusts the RDS CAs by default
      // hence, we have to add it in manually
      copyFiles: [{ from: '../backend/src/assets/db-ca.pem', to: 'db-ca.pem' }],
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        NODE_EXTRA_CA_CERTS: '/var/task/db-ca.pem',
      },
      nodejs: {
        sourcemap: true,
      },
    })
    app.stack(MyStack)
  },
} satisfies SSTConfig
