// import config from '@core/config'

const VAULT_DOMAIN = 'storage.vault.gov.sg'

/**
 * Validate hash for a given campaignId, recipient and version
 */
const validateVaultUrl = (url: string): void => {
  const vaultUrl = new URL(url)
  if (vaultUrl.hostname !== VAULT_DOMAIN) {
    // throw new Error('This is not a valid Vault url.')
  }

  // Check if url has expired using X-Amz-Expires header
}

export const TesseractService = {
  validateVaultUrl,
}
