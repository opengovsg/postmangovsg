'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('sms_messages', ['campaign_id'], {
      concurrently: true,
      logging: console.log,
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropIndex('sms_messages', ['campaign_id'], {
      logging: console.log,
    })
  },
}
