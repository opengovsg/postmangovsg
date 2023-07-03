'use strict';

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.addIndex('govsg_messages', ['service_provider_message_id'], {
      name: 'govsg_messages_service_provider_message_id_key',
      unique: true,
    })
    await queryInterface.addIndex('govsg_messages_transactional', ['service_provider_message_id'], {
      name: 'govsg_messages_transactional_service_provider_message_id_key',
      unique: true,
    })
  },
    down: async (queryInterface, _) => {
      await queryInterface.removeIndex('govsg_messages', 'govsg_messages_service_provider_message_id_key')
      await queryInterface.removeIndex('govsg_messages_transactional', 'govsg_messages_transactional_service_provider_message_id_key')
    }
  }
