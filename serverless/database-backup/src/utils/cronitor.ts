import axios from 'axios'
import { Cronitor } from '../interfaces'
import config from '../config'
import { Logger } from './logger'

const logger = new Logger('db-backup')

const CRONITOR_PING_URL = `https://cronitor.link`
const CRONITOR_CODE = config.get('cronitor.code')

const buildUrl = (action: string, message?: string): string => {
  const url = `${CRONITOR_PING_URL}/${CRONITOR_CODE}/${action}`
  return message ? `${url}?msg=${message}` : url
}

/**
 * Inform Cronitor that job has started
 */
const run = async (): Promise<void> => {
  const url = buildUrl('run')
  logger.log('Started Cronitor job')
  return axios.get(url)
}

/**
 * Inform Cronitor that job has completed
 */
const complete = (): Promise<void> => {
  const url = buildUrl('complete')
  logger.log('Completed Cronitor job')
  return axios.get(url)
}

/**
 * Inform Cronitor that job has failed
 * @param message
 */
const fail = (message?: string): Promise<void> => {
  const url = buildUrl('fail', message)
  logger.log(`Cronitor job has an error: ${message}`)
  return axios.get(url)
}

/**
 * Returns Cronitor only if code is provided
 */
export const getCronitor = (): Cronitor | null => {
  if (!CRONITOR_CODE) return null
  return {
    run,
    complete,
    fail,
  }
}
