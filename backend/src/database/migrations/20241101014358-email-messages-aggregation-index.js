'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('email_messages', {
      name: 'email_messages_campaign_id_status_error_code',
      fields: ['campaign_id', 'status', 'error_code'],
      concurrently: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('email_messages', 'email_messages_campaign_id_status_error_code')
  }
};
