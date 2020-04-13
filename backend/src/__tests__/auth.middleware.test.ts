import { getOtp } from '@core/middlewares'

const mockRequest = () => {
  let req : any
  return req
}

const mockResponse = () => {
  let res : any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.sendStatus = jest.fn().mockReturnValue(res)
  return res
}
describe ('getOtp', () => {
  test("getOtp should return 200", async () => {
    const req = mockRequest()
    const res = mockResponse()
    await getOtp(req, res)
    expect(res.sendStatus).toBeCalledWith(200)
  })
})