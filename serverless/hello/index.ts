import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"

export const hello = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event)
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Hello world!",
      },
      null,
      2
    ),
  }
}
