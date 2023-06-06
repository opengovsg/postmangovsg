'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('common_attachments', {
      id: {
        primaryKey: true,
        allowNull: false,
        type: Sequelize.DataTypes.UUID,
      },
      original_file_name: {
        allowNull: false,
        type: Sequelize.DataTypes.TEXT,
      },
      metadata: {
        type: Sequelize.DataTypes.JSONB,
      },
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DataTypes.DATE,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('common_attachments')
  },
}
