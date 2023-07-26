export async function handler() {
  console.log('hello')
  console.log(process.env.AWS_SES_FROM)
  return
}
