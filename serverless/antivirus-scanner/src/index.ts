import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2 } from 'aws-lambda'
// import { scanFileStream } from './clamscan.service'
// import { config } from './config'

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  let body
  if (event.body){
    body = JSON.parse(event.body)
  }
  console.log('hello world', body)
  // const { fileStream } = body

  // const scanResult = await scanFileStream(
  //   fileStream,
  // )
  
  return {
    statusCode: 200,
    // body: JSON.stringify(scanResult)
  }
}
