/* eslint-disable */
const zlib = require('zlib')

const payload = {
  messageType: 'DATA_MESSAGE',
  owner: '11111111111',
  logGroup: 'sns/ap-southeast-1/1111111111/DirectPublishToPhoneNumber',
  logStream: '12345678-1111-1111-1111-111111111111',
  subscriptionFilters: ['sns-sms-success'],
  logEvents: [
    {
      id: '1',
      timestamp: 1617788406750,
      message:
        '{"notification":{"messageId":"1111-1111-1111-1111-1111","timestamp":"2021-04-07 09:00:00.000"},"delivery":{"phoneCarrier":"M1","mnc":3,"numberOfMessageParts":1,"destination":"+6591234567","priceInUSD":0.05,"smsType":"Promotional","mcc":500,"providerResponse":"Message has been accepted by phone","dwellTimeMs":100,"dwellTimeMsUntilDeviceAck":4000},"status":"SUCCESS"}',
    },
    {
      id: '2',
      timestamp: 1617788406750,
      message:
        '{"notification":{"messageId":"2222-2222-2222-2222-2222","timestamp":"2021-04-07 09:00:00.000"},"delivery":{"phoneCarrier":"M1","mnc":3,"numberOfMessageParts":1,"destination":"+6591234567","priceInUSD":0.05,"smsType":"Promotional","mcc":500,"providerResponse":"Message has been accepted by phone","dwellTimeMs":100,"dwellTimeMsUntilDeviceAck":4000},"status":"SUCCESS"}',
    },
  ],
}

const payloadStr = JSON.stringify(payload)
const data = zlib.gzipSync(payloadStr).toString('base64')

module.exports = {
  awslogs: {
    data,
  },
}
