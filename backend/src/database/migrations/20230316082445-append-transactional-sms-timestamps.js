'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sms_messages_transactional', 'accepted_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    });
    await queryInterface.addColumn('sms_messages_transactional', 'sent_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    });
    await queryInterface.addColumn('sms_messages_transactional', 'delivered_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    });
    await queryInterface.addColumn('sms_messages_transactional', 'errored_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
    });

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sms_messages_transactional', 'accepted_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'sent_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'delivered_at')
    await queryInterface.removeColumn('sms_messages_transactional', 'errored_at')
  }
};
