'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('sms_messages_transactional', 'body', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('sms_messages_transactional', 'body', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    });
  }
};
