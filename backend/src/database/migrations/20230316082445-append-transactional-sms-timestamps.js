'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sms_messages_transactional', 'accepted_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('sms_messages_transactional', 'sent_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('sms_messages_transactional', 'delivered_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('sms_messages_transactional', 'errored_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sms_messages_transactional', 'accepted_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'sent_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'delivered_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'errored_at')
  }
};
