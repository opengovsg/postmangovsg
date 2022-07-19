'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('telegram_messages', ['campaign_id'], {
      concurrently: true,
      logging: console.log,
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropIndex('telegram_messages', ['campaign_id'], {
      logging: console.log,
    })
  },
}
