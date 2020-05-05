import * as path from 'path'
require('dotenv').config({ path: path.resolve(__dirname, '../../../.test-env') }) // A hack, dotenv won't replace existing env
import getApp from '../../app'
import { Application } from 'express'
import request from 'supertest'
import { otpClient } from '@core/services'
jest.mock('@core/services/mail.service')

let app: Application

const insertHash = async (email: string, hash: string) => {
  const OTP_EXPIRY = 600
  const hashedOtp = {
    hash,
    retries: 5,
    createdAt: Date.now()
  }
  await new Promise((resolve, reject) => {
    otpClient.set(email, JSON.stringify(hashedOtp), 'EX', OTP_EXPIRY, (error) => {
      if (error) {
        console.error(`Failed to save hashed otp: ${error}`)
        reject(error)
      }
      resolve(true)
    })
  })
}

beforeAll(async() => {
  app = await getApp()
})

describe('POST /auth/otp', () => {
  test('200 when there is email in body', async () => {
    const response = await(request(app)
      .post('/v1/auth/otp')
      .send({
        email: 'test@open.gov.sg'
      }))
      expect(response.status).toBe(200)
  })

  test('400 when there is no email in body', async () => {
    const response = await(request(app)
      .post('/v1/auth/otp')
      .send({
      }))
      expect(response.status).toBe(400)
  })

  test('401 when email is not a gov.sg', async () => {
    const response = await(request(app)
      .post('/v1/auth/otp')
      .send({
        email: 'test@test.com'
      }))
      expect(response.status).toBe(401)
  })
})

describe('POST /auth/login', () => {
  const url = '/v1/auth/login'
  const validOtp = '123456'
  const validHash = '$2b$10$6uW1ZpY7FAkZnQ1jgYcIRes1UfON4EEXbefNPsX8odnxGksI8bG9S'
  test('400 when there is otp and email in body', async () => {
    const response = await(request(app)
      .post(url))
      expect(response.status).toBe(400)
  })

  test('200 when email and otp is valid', async () => {
    await insertHash('test@open.gov.sg', validHash)
    const response = await(request(app)
      .post(url)
      .send({
        email: 'test@open.gov.sg',
        otp: validOtp
      }))
      expect(response.status).toBe(200)
  })
})