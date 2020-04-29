import * as path from 'path'
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.test') }) // A hack, dotenv won't replace existing env
import getApp from '../../app'
import { Application } from 'express'
import request from 'supertest'
jest.mock('@core/services/mail.service')

let app: Application

beforeAll(async() => {
  app = await getApp()
})

describe('POST /auth/otp', () => {
  test('Should respond with a 200 when there is email in body', async () => {
    const response = await(request(app)
      .post('/v1/auth/otp')
      .send({
        email: 'test@open.gov.sg'
      }))
      expect(response.status).toBe(200)
  })
})