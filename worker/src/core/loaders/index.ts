import scriptLoader from './script.loader'
import messageWorkerLoader from './message-worker.loader'
import config from '@core/config'

const loaders = async (): Promise<void> => {
  // During development mode, we only load scripts from sender to avoid a conflict.
  const isDevLogger =
    config.get('env') === 'development' &&
    config.get('messageWorker.numLogger') > 0
  if (!isDevLogger) await scriptLoader()

  await messageWorkerLoader()
}

export { loaders }
