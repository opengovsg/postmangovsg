'use strict';

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.removeConstraint('email_messages_transactional_cc', 'unique_cc_recipient_per_email')
  },

  down: async (queryInterface, _) => {
    await queryInterface.addConstraint('email_messages_transactional_cc', {
      name: 'unique_cc_recipient_per_email',
      type: 'unique',
      fields: ['email_message_transactional_id', 'email', 'cc_type'],
    })
  }
};
