'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('campaigns', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.DataTypes.ENUM('SMS', 'EMAIL', 'TELEGRAM'),
        allowNull: false,
      },
      cred_name: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
        references: {
          model: 'credentials',
          key: 'name',
        },
        onUpdate: 'CASCADE',
      },
      s3_object: {
        type: Sequelize.DataTypes.JSON,
        allowNull: true,
      },
      valid: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
      },
      protect: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      halted: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      demo_message_limit: {
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
    await queryInterface.dropTable('campaigns')
  },
}
