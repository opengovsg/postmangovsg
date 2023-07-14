'use strict';

const { CcType } = require("@email/models");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_messages_transactional_cc', {
      email_message_transactional_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'email_messages_transactional',
          key: 'id',
        },
        primaryKey: true,
      },
      email: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      cc_type: {
        type: Sequelize.DataTypes.ENUM(
          Object.values(CcType)
        ),
        allowNull: false,
        primaryKey: true,
      },
      error_code: {
        type: Sequelize.DataTypes.STRING(255),
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
    await queryInterface.addConstraint('email_messages_transactional_cc', {
      name: 'unique_cc_recipient_per_email',
      type: 'unique',
      fields: ['email_message_transactional_id', 'email', 'cc_type'],
    })

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_messages_transactional_cc')
  },
};
