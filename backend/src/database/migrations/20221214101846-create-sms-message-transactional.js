'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sms_messages_transactional', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      credentials_label: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      recipient: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      body: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('sms_messages_transactional')
  }
};
