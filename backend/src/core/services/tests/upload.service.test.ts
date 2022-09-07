jest.mock('@core/services/s3-client.class')

const parseCsvMock = {
  parseAndProcessCsv: async (
    _: NodeJS.ReadableStream,
    onPreview: () => Promise<void>
  ) => {
    // using onPreview here to commit the transaction so we can close the
    // connection after and spy if we want to
    await onPreview()
  },
}
jest.mock('../', () => ({
  ParseCsvService: parseCsvMock,
}))

import { EmailTemplate } from '@email/models'
import { waitForMs } from '@shared/utils/wait-for-ms'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { Sequelize, Transaction } from 'sequelize/types'
import { UploadService } from '../upload.service'

let sequelize: Sequelize
beforeEach(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})
afterEach(async () => {
  await sequelize.close()
})

describe('Upload Service', () => {
  describe('processUpload', () => {
    it('should be able to retry if the server shuts down connection is lost', async () => {
      const spyFn = jest.fn()
      try {
        await UploadService.processUpload(
          // a curry function that will return a transaction-commiting function
          // for us to run inside parseCsvMock.parseAndProcessCsv later
          ({ transaction }: { transaction: Transaction }) =>
            async () => {
              await transaction.commit()
              await sequelize.close()
              spyFn()
            },
          jest.fn()
        )({
          campaignId: 1,
          template: {
            campaignId: 1,
          } as EmailTemplate,
          s3Key: 'test',
          etag: 'test',
          filename: 'test',
        })
      } catch (e) {
        const errMessage = (e as Error).message
        // since it's not an actual crash, the finally block in processUpload will
        // still get executed - trying to query for unlocking, hence we need to
        // ignore that error
        if (
          !errMessage.includes(
            'ConnectionManager.getConnection was called after the connection manager was closed'
          )
        ) {
          throw e
        }
      }
      await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
      await UploadService.processUpload(
        // a curry function that will return a transaction-commiting function
        // for us to run inside parseCsvMock.parseAndProcessCsv later
        ({ transaction }: { transaction: Transaction }) =>
          async () => {
            await transaction.commit()
            spyFn()
          },
        jest.fn()
      )({
        campaignId: 1,
        template: {
          campaignId: 1,
        } as EmailTemplate,
        s3Key: 'test',
        etag: 'test',
        filename: 'test',
      })

      expect(spyFn).toBeCalledTimes(2)
    })

    it('should not parse a campaignId-duplicate job', async () => {
      const spyFn = jest.fn()
      const waitTime = 300
      await Promise.all([
        UploadService.processUpload(
          // a curry function that will return a transaction-commiting function
          // for us to run inside parseCsvMock.parseAndProcessCsv later
          ({ transaction }: { transaction: Transaction }) =>
            async () => {
              // wait here so this first one will take some time to not end before
              // the second call
              await waitForMs(waitTime)
              await transaction.commit()
              spyFn()
            },
          jest.fn()
        )({
          campaignId: 1,
          template: {
            campaignId: 1,
          } as EmailTemplate,
          s3Key: 'test',
          etag: 'test',
          filename: 'test',
        }),
        (async () => {
          // wait for the first call to acquire the lock first before starting the
          // second call. This wait period need to be shorter than the time taken
          // for the other call to finish hence the (-200)
          await waitForMs(waitTime - 200)
          await UploadService.processUpload(
            // a curry function that will return a transaction-commiting function
            // for us to run inside parseCsvMock.parseAndProcessCsv later
            ({ transaction }: { transaction: Transaction }) =>
              async () => {
                await transaction.commit()
                spyFn()
              },
            jest.fn()
          )({
            campaignId: 1,
            template: {
              campaignId: 1,
            } as EmailTemplate,
            s3Key: 'test',
            etag: 'test',
            filename: 'test',
          })
        })(),
      ])

      expect(spyFn).toBeCalledTimes(1)
    })
  })
})
