'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('statistics', {
      campaign_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      unsent: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      errored: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      sent: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      invalid: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
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
    await queryInterface.dropTable('statistics')
  },
}
