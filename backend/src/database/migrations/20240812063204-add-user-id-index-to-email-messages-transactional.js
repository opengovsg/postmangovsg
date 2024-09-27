'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('email_messages_transactional', {
      name: 'email_messages_transactional_user_id_tag_idx',
      fields: ['user_id', 'tag']
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('email_messages_transactional', 'email_messages_transactional_user_id_tag_idx')
  }
};
