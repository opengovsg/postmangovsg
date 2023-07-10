'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_lists')
    await queryInterface.dropTable('lists')
    await queryInterface.removeColumn('campaigns', 'should_save_list')
  },

  down: async (queryInterface, Sequelize) => {
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
        type: Sequelize.DataTypes.ENUM('SMS', 'EMAIL', 'TELEGRAM'),
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
    await queryInterface.createTable('user_lists', {
      user_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      list_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        references: {
          model: 'lists',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    await queryInterface.addColumn('campaigns', 'should_save_list', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: true,
    })
  },
}
