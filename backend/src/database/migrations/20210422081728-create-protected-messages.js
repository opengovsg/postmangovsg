'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('protected_messages', {
      id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      payload: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      password_hash: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      version: {
        type: Sequelize.DataTypes.INTEGER,
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
    await queryInterface.dropTable('protected_messages')
  },
}
