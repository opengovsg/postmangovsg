import getApp from '../../app'
import {Application} from 'express'
import request from 'supertest'

let app : Application

beforeAll(async() => {
  app = await getApp()
})

describe('GET /projects', () => {
  test('Should respond with a 200', async () => {
    const response = await(request(app).get('/v1/projects'))
    expect(response.status).toBe(200)
  })
})