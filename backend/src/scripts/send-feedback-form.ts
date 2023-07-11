import fs from 'fs'
import path from 'path'
import promptSync from 'prompt-sync'
import csv from 'csvtojson'
import axios from 'axios'

const endpoint = '/v1/transactional/govsg/send'

void (async function main() {
  const prompt = promptSync()
  const fileName = prompt('Enter .csv file name in temp folder: ')
  const recipients = (
    await csv({ output: 'csv' }).fromFile(
      path.resolve(__dirname, '../../src/temp', fileName)
    )
  ).map((r) => r[0]) as string[]
  const env = prompt('Enter environment (dev/stg/prod): ')
  if (env !== 'dev' && env !== 'stg' && env !== 'prod') {
    console.log('Invalid environment')
    process.exit(1)
  }
  const baseUrl =
    env === 'dev'
      ? 'http://localhost:4000'
      : env === 'stg'
      ? 'https://api-staging.postman.gov.sg'
      : 'https://api.postman.gov.sg'
  const apiKey = prompt('Enter API key: ')
  const axiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const newFile = path.resolve(
    __dirname,
    '../../src/temp',
    `${fileName}-response.csv`
  )
  for (const recipient of recipients) {
    try {
      const response = await axiosInstance.post<{ id: string }>(endpoint, {
        recipient,
        whatsapp_template_label: 'sgc_trial1_feedback_message',
      })
      const { id } = response.data
      fs.appendFileSync(newFile, `${recipient},${id},\n`)
      console.log(`Sent to ${recipient}, message id ${id}`)
    } catch (e) {
      fs.appendFileSync(newFile, `${recipient},error,\n`)
    }
  }
  console.log('Done ✅')
  process.exit(0)
})()
