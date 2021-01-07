import request from 'supertest'
import app from '../server'
import { userModelMock } from '@tests/setup'

describe('POST /auth/otp', () => {
  test('Invalid email format', async (done) => {
    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user!@open' })
    expect(res.status).toBe(400)
    done()
  })

  test('Non gov.sg and non-whitelisted email', async (done) => {
    // Mock db query to User table to return null to mock user who is not whitelisted
    userModelMock.$queueResult(null)

    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user@agency.com.sg' })
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ message: 'User is not authorized' })
    done()
  })

  test('Non gov.sg and whitelisted email', async (done) => {
    // Mock db query to User table to return null to mock user who is not whitelisted
    userModelMock.$queueResult(
      userModelMock.build({ email: 'user@agency.com.sg' })
    )

    const res = await request(app)
      .post('/auth/otp')
      .send({ email: 'user@agency.com.sg' })
    expect(res.status).toBe(200)
    done()
  })
})

describe('POST /auth/login', () => {
  test('Invalid otp format', async (done) => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@agency.gov.sg', otp: '123' })
    expect(res.status).toBe(400)
    done()
  })

  test('Invalid otp', async (done) => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@agency.gov.sg', otp: '000000' })
    expect(res.status).toBe(401)
    done()
  })

  test('Valid otp', async (done) => {
    // TODO
    done()
  })
})

describe('GET /auth/userinfo', () => {
  test('No existing session', async (done) => {
    const res = await request(app).get('/auth/userinfo')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({})
    done()
  })

  test('Existing session found', async (done) => {
    // TODO
    done()
  })
})

describe('GET /auth/logout', () => {
  test('Successfully logged out', async (done) => {
    const res = await request(app).get('/auth/logout')
    expect(res.status).toBe(200)
    done()
  })
})
