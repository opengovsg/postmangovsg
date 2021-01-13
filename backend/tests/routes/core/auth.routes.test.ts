import request from 'supertest'
import app from '../server'
import { AuthService } from '@core/services'
import { UserMock } from '@tests/setup'

describe('POST /auth/otp', () => {
  test('Invalid email format', async () => {
    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user!@open' })
    expect(res.status).toBe(400)
  })

  test('Non gov.sg and non-whitelisted email', async () => {
    // Mock db query to User table to return null to mock user who is not whitelisted
    UserMock.$queueResult(null)

    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user@agency.com.sg' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'User is not authorized' })
  })

  test('Non gov.sg and whitelisted email', async () => {
    // Mock db query to User table to return null to mock user who is not whitelisted
    UserMock.$queueResult(UserMock.build({ email: 'user@agency.com.sg' }))

    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user@agency.com.sg' })
    expect(res.status).toBe(200)
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
    // Mock user query
    AuthService.findOrCreateUser = jest.fn(async () =>
      UserMock.build({ email })
    )

    const res = await request(app)
      .post('/auth/login')
      .send({ email, otp: '123456' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })
})

describe('GET /auth/userinfo', () => {
  test('No existing session', async () => {
    const res = await request(app).get('/auth/userinfo').set('Cookies', '')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })

  test('Existing session found', async () => {
    // TODO - mock user session
    // const email = 'user@agency.gov.sg'
    // await request(app).post('/auth/login').send({ email, otp: '123456' })
    // const res = await request(app).get('/auth/userinfo')
    // expect(res.status).toBe(200)
    // expect(res.body).toEqual({})
    expect(true).toEqual(true)
  })
})

describe('GET /auth/logout', () => {
  test('Successfully logged out', async () => {
    const res = await request(app).get('/auth/logout')
    expect(res.status).toBe(200)
  })
})
