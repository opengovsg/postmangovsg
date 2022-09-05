'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('email_messages', ['campaign_id'], {
      concurrently: true,
      logging: console.log,
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropIndex('email_messages', ['campaign_id'], {
      logging: console.log,
    })
  },
}
