'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('govsg_templates_access', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'govsg_templates',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex('govsg_templates_access', ['template_id', 'user_id'], {
      unique: true,
      name: 'govsg_templates_access_template_id_user_id_unique'
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('govsg_templates_access')
  }
};
