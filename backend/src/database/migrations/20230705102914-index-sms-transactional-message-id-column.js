'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.addIndex(
      'sms_messages_transactional',
      ['message_id'],
      {
        name: 'sms_messages_transactional_message_id_key',
        unique: true,
        concurrently: true,
      }
    )
  },
  down: async (queryInterface, _) => {
    await queryInterface.removeIndex(
      'sms_messages_transactional',
      'sms_messages_transactional_message_id_key'
    )
  },
}
