'use strict'

const { TransactionalEmailMessageStatus } = require('@email/models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_messages_tx', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_email: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'email',
        },
        onUpdate: 'CASCADE',
      },
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
      params: {
        type: Sequelize.DataTypes.JSON,
        allowNull: false,
      },
      has_attachment: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
      },
      attachment_s3_object: {
        type: Sequelize.DataTypes.JSON,
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.ENUM(
          TransactionalEmailMessageStatus.Unsent,
          TransactionalEmailMessageStatus.InvalidFromAddressError,
          TransactionalEmailMessageStatus.RateLimitError,
          TransactionalEmailMessageStatus.InvalidMessageError,
          TransactionalEmailMessageStatus.UnsupportedFileTypeError,
          TransactionalEmailMessageStatus.MaliciousFileError,
          TransactionalEmailMessageStatus.BlacklistedRecipientError,
          TransactionalEmailMessageStatus.Accepted,
          TransactionalEmailMessageStatus.Sent
        ),
        allowNull: false,
      },
      sent_at: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      error_code: {
        allowNull: true,
        type: Sequelize.DataTypes.STRING(255),
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
    await Promise.all([
      queryInterface.dropTable('email_messages_tx'),
      queryInterface.sequelize.query(
        'DROP TYPE "enum_email_messages_tx_status";'
      ),
    ])
  },
}
