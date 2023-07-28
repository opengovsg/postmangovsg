// to replace with fetch when upgraded to Node 18
import axios, { AxiosError } from 'axios'
import { Config } from 'sst/node/config'

const SST_STAGE = process.env.SST_STAGE

export interface Email {
  recipient: string
  subject: string
  body: string
  tag: string
  from?: string
  // attachments?
}
export const sendEmail = async (email: Email) => {
  const baseURL =
    SST_STAGE === 'prod'
      ? 'https://api.postman.gov.sg/v1'
      : 'https://api-staging.postman.gov.sg/v1'
  await axios
    .post(`${baseURL}/transactional/email/send`, email, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Config.POSTMAN_API_KEY}`,
      },
    })
    .catch((err) => {
      if (err instanceof AxiosError && err.response?.status === 400) {
        const { message } = err.response.data
        if (message === 'Recipient email is blacklisted') {
          console.log(
            `Recipient email ${email.recipient} is blacklisted, skipping`,
          )
          return
        }
      }
      console.error(err)
      throw err
    })
}
