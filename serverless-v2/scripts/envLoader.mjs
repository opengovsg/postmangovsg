import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm'
import fs from 'fs'

// This is a helper for local file runs or jest, as specified in package.json
// It emulates the loading of SSM which Lambda will do.
// This file is not meant to be used in a deployment and is .mjs so we can use top-level await
async function saveAllParameters() {
  const client = new SSMClient({ region: 'ap-southeast-1' })
  const prefix = `/${process.env.ENV}/`
  const params = {}

  let nextToken

  do {
    // Handle pagination (max 10 params per call)
    const res = await client.send(
      new GetParametersByPathCommand({
        Path: prefix,
        Recursive: true,
        WithDecryption: true,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }),
    )

    for (const parameter of res.Parameters ?? []) {
      const paramName = parameter.Name.slice(prefix.length)
      const isStringList = parameter.Type === 'StringList'
      params[paramName] = isStringList
        ? `[${parameter.Value.split(',').map((x) => `"${x}"`)}]`
        : parameter.Value
    }

    nextToken = res.NextToken
  } while (nextToken)

  // format strings, JSON strings, and StringList appropriately
  const envString = Object.entries(params)
    .map(([k, v]) => {
      const strippedValue = v.replace(/\s/g, '')
      const looksLikeJson = strippedValue.includes('{')
      return looksLikeJson ? `${k}=${strippedValue}` : `${k}='${strippedValue}'`
    })
    .join('\n')
    .concat(`\nENV=${process.env.ENV}`)

  await fs.promises.writeFile('.env', envString)
}

await saveAllParameters()
