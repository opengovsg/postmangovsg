import scriptLoader from './script.loader'
import messageWorkerLoader from './message-worker.loader'
const loaders = async (): Promise<void> => {
  await scriptLoader()
  await messageWorkerLoader()
}

export { loaders }