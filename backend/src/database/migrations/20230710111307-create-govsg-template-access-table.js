'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('govsg_templates_access', {
      template_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        onDelete: 'NO ACTION',
        allowNull: false,
        references: {
          model: 'govsg_templates',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        onDelete: 'NO ACTION',
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
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
    await queryInterface.dropTable('govsg_templates_access')
  }
};
