'use strict'

const {
  TransactionalEmailMessageStatus,
} = require('@email/../../../../shared/src/email/models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_messages_transactional', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      // superseded by 20221005070028-email-messages-transactional-make-from-nullable.js
      from_name: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      from_address: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      recipient: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING(255),
      },
      // superseded by 20221009141317-change-json-to-jsonb-everywhere.js
      params: {
        type: Sequelize.DataTypes.JSON,
        allowNull: false,
      },
      message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      // superseded by 20221009141317-change-json-to-jsonb-everywhere.js
      attachments_metadata: {
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.JSON),
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.ENUM(
          Object.values(TransactionalEmailMessageStatus)
        ),
        allowNull: false,
      },
      error_code: {
        allowNull: true,
        type: Sequelize.DataTypes.STRING(255),
      },
      accepted_at: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      sent_at: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      delivered_at: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      opened_at: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
      },
    })
  },
  down: async (queryInterface, _) => {
    await queryInterface.dropTable('email_messages_transactional')
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_email_messages_transactional_status";'
    )
  },
}
