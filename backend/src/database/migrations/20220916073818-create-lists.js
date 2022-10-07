'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lists', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      s3key: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      etag: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      filename: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      channel: {
        type: Sequelize.DataTypes.ENUM(
          'SMS',
          'EMAIL',
          'TELEGRAM'
        ),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('lists')
  },
}
