'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_templates', 'default_param_values', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.createTable('user_experimental', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      feature: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.DataTypes.JSONB,
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
    await queryInterface.addConstraint('user_experimental', {
      name: 'unique_user_id_per_feature',
      type: 'unique',
      fields: ['user_id', 'feature'],
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_experimental')
    await queryInterface.removeColumn('govsg_templates', 'default_param_values')
  },
}
