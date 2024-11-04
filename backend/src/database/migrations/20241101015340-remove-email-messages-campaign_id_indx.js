'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('email_messages', 'email_messages_campaign_id')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('email_messages', {
      name: 'email_messages_campaign_id',
      fields: ['campaign_id'],
      concurrently: true,
    })
  }
};
