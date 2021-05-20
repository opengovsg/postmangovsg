import config from '@core/config'
import { ChannelType } from '@core/constants'
import { UploadService } from '@core/services'
import { EmailTemplateService } from '@email/services'
import { SmsTemplateService } from '@sms/services'
import { TelegramTemplateService } from '@telegram/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
enum QueueEvent {
  FAILED = 'job failed',
  STALLED = 'stalled',
}

const checkStalledJobsCallback = (err: Error, numStalled: number): void => {
  if (err) {
    return logger.error({
      message:
        'Error encountered while checking for stalled jobs in upload queue',
      error: err,
    })
  }

  if (numStalled > 0) {
    logger.info({
      message: `Checked for stalled jobs in upload queue and found ${numStalled} stalled jobs.`,
    })
  }
}

const initUploadQueue = async (): Promise<void> => {
  const uploadQueue = await UploadService.getUploadQueue()

  uploadQueue.process(
    config.get('upload.concurrency'),
    async (job): Promise<void> => {
      const { channelType, data, protect } = job.data

      switch (channelType) {
        case ChannelType.Email:
          return protect
            ? EmailTemplateService.processProtectedUpload(data)
            : EmailTemplateService.processUpload(data)

        case ChannelType.SMS:
          return SmsTemplateService.processUpload(data)

        case ChannelType.Telegram:
          return TelegramTemplateService.processUpload(data)
      }
    }
  )

  uploadQueue.on(QueueEvent.FAILED, async (id, err) => {
    const { data } = await UploadService.getUpload(id)
    logger.error({
      message: `Processing for campaign ${data.campaignId} recipient list failed`,
      error: err,
      ...data,
    })
  })

  uploadQueue.on(QueueEvent.STALLED, async (id) => {
    const { data } = await UploadService.getUpload(id)
    logger.info({
      message: `Upload for campaign ${data.campaignId} stalled and will be reprocessed`,
      ...data,
    })
  })

  uploadQueue.checkStalledJobs(
    config.get('upload.checkStalledInterval'),
    checkStalledJobsCallback
  )
}

export default initUploadQueue
