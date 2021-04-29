'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_demos', {
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      num_demos_sms: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      num_demos_telegram: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      is_displayed: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.dropTable('user_demos')
  },
}
