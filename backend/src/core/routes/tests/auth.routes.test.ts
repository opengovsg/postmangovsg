// import request from 'supertest'
// import { Sequelize } from 'sequelize-typescript'
// import bcrypt from 'bcrypt'
// import initialiseServer from '@test-utils/server'
// import sequelizeLoader from '@test-utils/sequelize-loader'
// import { MailService } from '@core/services'
// import { User } from '@core/models'

// const app = initialiseServer()
// const appWithUserSession = initialiseServer(true)
// let sequelize: Sequelize

// beforeAll(async () => {
//   sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
// })

// afterEach(async () => {
//   await User.destroy({ where: {} })
// })

// afterAll(async () => {
//   await sequelize.close()
//   await (app as any).cleanup()
//   await (appWithUserSession as any).cleanup()
// })

// describe('POST /auth/otp', () => {
//   test('Invalid email format', async () => {
//     const res = await request(app)
//       .post('/auth/otp')
//       .send({ email: 'user!@open' })
//     expect(res.status).toBe(400)
//   })

//   test('Non gov.sg and non-whitelisted email', async () => {
//     // There are no users in the db
//     const res = await request(app)
//       .post('/auth/otp')
//       .send({ email: 'user@agency.com.sg' })
//     expect(res.status).toBe(401)
//     expect(res.body).toEqual({ message: 'User is not authorized' })
//   })

//   test('OTP is generated and sent to user', async () => {
//     const res = await request(app)
//       .post('/auth/otp')
//       .send({ email: 'user@agency.gov.sg' })
//     expect(res.status).toBe(200)

//     expect(MailService.mailClient.sendMail).toHaveBeenCalledWith(
//       expect.objectContaining({
//         body: expect.stringMatching(/Your OTP is <b>[A-Z0-9]{6}<\/b>/),
//       })
//     )
//   })
// })

// describe('POST /auth/login', () => {
//   test('Invalid otp format provided', async () => {
//     const res = await request(app)
//       .post('/auth/login')
//       .send({ email: 'user@agency.gov.sg', otp: '123' })
//     expect(res.status).toBe(400)
//   })

//   test('Invalid otp provided', async () => {
//     const res = await request(app)
//       .post('/auth/login')
//       .send({ email: 'user@agency.gov.sg', otp: '000000' })
//     expect(res.status).toBe(401)
//   })

//   test('OTP is invalidated after retries are exceeded', async () => {
//     const email = 'user@agency.gov.sg'
//     const otp = JSON.stringify({
//       retries: 1,
//       hash: await bcrypt.hash('123456', 10),
//       createdAt: 123,
//     })
//     await new Promise((resolve) =>
//       (app as any).redisService.otpClient.set(email, otp, resolve)
//     )

//     const res = await request(app)
//       .post('/auth/login')
//       .send({ email, otp: '000000' })
//     expect(res.status).toBe(401)
//     // OTP should be deleted after exceeding retries
//     ;(app as any).redisService.otpClient.get(email, (_err: any, value: any) => {
//       expect(value).toBe(null)
//     })
//   })

//   test('Valid otp provided', async () => {
//     const email = 'user@agency.gov.sg'
//     const otp = JSON.stringify({
//       retries: 1,
//       hash: await bcrypt.hash('123456', 10),
//       createdAt: 123,
//     })
//     await new Promise((resolve) =>
//       (app as any).redisService.otpClient.set(email, otp, resolve)
//     )

//     const res = await request(app)
//       .post('/auth/login')
//       .send({ email, otp: '123456' })
//     expect(res.status).toBe(200)
//   })
// })

// describe('GET /auth/userinfo', () => {
//   test('No existing session', async () => {
//     const res = await request(app).get('/auth/userinfo')
//     expect(res.status).toBe(200)
//     expect(res.body).toEqual({})
//   })

//   test('Existing session found', async () => {
//     await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
//     const res = await request(appWithUserSession).get('/auth/userinfo')
//     expect(res.status).toBe(200)
//     expect(res.body.id).toEqual(1)
//     expect(res.body.email).toEqual('user@agency.gov.sg')
//   })
// })

// describe('GET /auth/logout', () => {
//   test('Successfully logged out', async () => {
//     const res = await request(appWithUserSession).get('/auth/logout')
//     expect(res.status).toBe(200)
//   })
// })
