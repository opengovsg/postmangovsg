'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('govsg_verification', {
      id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      govsg_message_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'govsg_messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      passcode_creation_wamid: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      passcode: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('govsg_verification')
  },
}
