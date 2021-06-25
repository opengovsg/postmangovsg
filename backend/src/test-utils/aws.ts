import AWS from 'aws-sdk'

const spyOn = (service: string, method: string): jest.Mock => {
  const spy = jest.fn()
  const clients = AWS as any
  clients[service].prototype[method] = spy
  return spy
}

export const MockAws = {
  spyOn,
}
