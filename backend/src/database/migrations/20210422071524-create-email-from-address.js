'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_from_address', {
      email: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.DataTypes.TEXT,
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
    await queryInterface.dropTable('email_from_address')
  },
}
