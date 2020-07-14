/**
 * Generates a random-length whitespace string for padding purposes.
 *
 * If a user has previously hidden/dismissed the custom keyboard, some Telegram clients (e.g. iOS)
 * continue hiding the custom keyboard sent with subsequent messages if there are no changes
 * detected in the button labels. A random-length whitespace string is padded to the button labels
 * to force clients to always show the custom keyboard. This has no visible effect to users because
 * Telegram trims whitespace before it reaches the user.
 */
export const generatePadding = (): string => {
  const padLength = Math.round(Math.random() * 100)
  return ' '.repeat(padLength)
}
