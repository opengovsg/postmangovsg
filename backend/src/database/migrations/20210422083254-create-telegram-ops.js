'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('telegram_ops', {
      id: {
        autoIncrement: true,
        // todo: for some reason, this is a BIGINT but `telegram_messages` has it as a STRING(255)
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      recipient: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
      },
      params: {
        type: Sequelize.DataTypes.JSON,
        allowNull: true,
      },
      message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_code: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        // todo: for some reason, this doesn't reference `enum_telegram_messages_status` in `telegram_messages`
        type: Sequelize.DataTypes.ENUM(
          'SENDING',
          'ERROR',
          'SUCCESS',
          'INVALID_RECIPIENT'
        ),
        allowNull: true,
      },
      dequeued_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      received_at: {
        type: Sequelize.DataTypes.DATE,
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

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('telegram_ops')
  },
}
