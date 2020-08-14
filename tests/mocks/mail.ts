import axios from 'axios'
import { get } from 'lodash'
import MailDev from 'maildev'

const MAILDEV_URL = 'http://localhost:1080'

/**
 * Initialize and start mailDev server
 */
const start = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const maildev = new MailDev({})
    maildev.listen((err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

/**
 * Get all emails
 */
const getAll = async (): Promise<Array<any>> => {
  return axios.get(`${MAILDEV_URL}/email`).then((res) => res.data)
}

/**
 * Get the last received email for a given email address
 * @param toEmail
 */
const getLatestEmail = async (toEmail: string): Promise<any> => {
  const emails = await getAll()
  const latest = emails
    .filter((e: any) => get(e, 'to[0].address') === toEmail)
    .sort((a: any, b: any) => a.time - b.time)
    .pop()

  return latest
}

/**
 * Delete email by id
 * @param id
 */
const deleteById = (id: string): Promise<void> => {
  return axios.delete(`${MAILDEV_URL}/email/${id}`)
}

/**
 * Delete all email
 */
const deleteAll = (): Promise<void> => {
  return axios.delete(`${MAILDEV_URL}/email/all`)
}

export const MockMailServer = {
  start,
  getAll,
  getLatestEmail,
  deleteById,
  deleteAll,
}
