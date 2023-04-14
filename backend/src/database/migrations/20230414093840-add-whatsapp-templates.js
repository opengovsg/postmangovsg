'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('whatsapp_templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      whatsapp_template_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING(255),
      },
      body: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      subject: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      params: {
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('whatsapp_templates')
  }
};
