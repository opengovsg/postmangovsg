'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.addIndex(
      'govsg_ops',
      ['service_provider_message_id'],
      {
        name: 'govsg_ops_service_provider_message_id_key',
        unique: true,
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeIndex(
      'govsg_ops',
      ['service_provider_message_id'],
      {
        name: 'govsg_ops_service_provider_message_id_key',
        unique: true,
      }
    )
  },
}
