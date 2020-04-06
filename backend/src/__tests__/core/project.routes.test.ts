import app from '../../app'
import request from 'supertest'


describe('GET /projects', () => {
  test('Should respond with a 200', async (done) => {
    const response = await(request(app).get('/v1/projects'))
    expect(response.status).toBe(200)
    done()
  })
})