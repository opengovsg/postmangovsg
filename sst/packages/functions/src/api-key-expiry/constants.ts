export const reminderEmailBodyGenerator = (
  apiKeyLabel: string,
  lastFive: string,
  validUntil: string,
  email: string,
) => {
  return `Hi there,
  Your API key ${apiKeyLabel} is expiring soon. Please renew it before ${validUntil} to continue using the API.
  Your last five digits of your API key is ${lastFive}.
  Your email is ${email}.
  Thank you!`
}
