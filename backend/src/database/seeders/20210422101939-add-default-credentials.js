'use strict'

// todo: find a way to deduplicate the code
const formatDefaultCredentialName = (name) =>
  `demo/${process.env.NODE_ENV}/${name}`

const CREDENTIAL_NAMES = [
  'EMAIL_DEFAULT',
  formatDefaultCredentialName('Postman_SMS_Demo'),
  formatDefaultCredentialName('Postman_Telegram_Demo'),
]

const CREDENTIALS = CREDENTIAL_NAMES.map((name) => ({
  name,
  created_at: new Date(),
  updated_at: new Date(),
}))

module.exports = {
  up: async (queryInterface, _) => {
    // Create the default credential names in the credentials table
    // Each name should be accompanied by an entry in Secrets Manager
    await queryInterface.bulkInsert('credentials', CREDENTIALS)
  },

  down: async (queryInterface, _) => {
    await queryInterface.bulkDelete('credentials', {
      name: Object.values(CREDENTIAL_NAMES),
    })
  },
}
