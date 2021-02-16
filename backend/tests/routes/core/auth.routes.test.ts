import request from 'supertest'
import app from '../server'
import sequelizeLoader from '../sequelize-loader'
import { AuthService } from '@core/services'

beforeAll(async () => {
  await sequelizeLoader()
})

describe('POST /auth/otp', () => {
  test('Invalid email format', async () => {
    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user!@open' })
    expect(res.status).toBe(400)
  })

  test('Non gov.sg and non-whitelisted email', async () => {
    // There are no users in the db
    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user@agency.com.sg' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'User is not authorized' })
  })
})

describe('POST /auth/login', () => {
  test('Invalid otp format', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@agency.gov.sg', otp: '123' })
    expect(res.status).toBe(400)
  })

  test('Invalid otp', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@agency.gov.sg', otp: '000000' })
    expect(res.status).toBe(401)
  })

  test('Valid otp', async () => {
    const email = 'user@agency.gov.sg'
    // Mock verification of otp
    AuthService.verifyOtp = jest.fn(async () => true)

    const res = await request(app)
      .post('/auth/login')
      .send({ email, otp: '123456' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })
})

describe('GET /auth/userinfo', () => {
  test('No existing session', async () => {
    const res = await request(app).get('/auth/userinfo')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })

  // test('Existing session found', async () => {
  //   // Mock verification of otp
  //   AuthService.verifyOtp = jest.fn(async () => true)
  //   const email = 'user@agency.gov.sg'
  //   await request(app).post('/auth/login').send({ email, otp: '123456' })
  //   const res = await request(app).get('/auth/userinfo')
  //   expect(res.status).toBe(200)
  //   expect(res.body).toEqual({})
  // })
})

describe('GET /auth/logout', () => {
  test('Successfully logged out', async () => {
    const res = await request(app).get('/auth/logout')
    expect(res.status).toBe(200)
  })
})
