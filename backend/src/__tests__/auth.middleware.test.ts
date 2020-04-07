const httpMocks = require('node-mocks-http')

import { getOtp } from '@core/middlewares'

describe ('getOtp', () => {
  test("getOtp should return 200", () => {
    const request = httpMocks.createRequest({
      method: "POST",
    })
    const response = httpMocks.createResponse()
    getOtp(request, response)
    expect(response.statusCode).toBe(200)
  })
})