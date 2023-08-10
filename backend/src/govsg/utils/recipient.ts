export const removeWhitespacesAndPrependCountryCode = (recipient: string) => {
  const withoutWhitespaces = recipient.replace(/\s/g, '')
  const hasCountryCode = recipient.startsWith('+')
  if (hasCountryCode) {
    return withoutWhitespaces
  }
  return `+65${withoutWhitespaces}`
}
