'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      'email_messages_transactional',
      'attachments_metadata',
      {
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.JSONB),
        allowNull: true,
      }
    )
    await queryInterface.changeColumn(
      'email_messages_transactional',
      'params',
      {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      }
    )
    await queryInterface.changeColumn('email_messages', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('sms_messages', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('telegram_messages', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('email_ops', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('sms_ops', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('telegram_ops', 'params', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.changeColumn('campaigns', 's3_object', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      'email_messages_transactional',
      'attachments_metadata',
      {
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.JSON),
        allowNull: true,
      }
    )
    await queryInterface.changeColumn(
      'email_messages_transactional',
      'params',
      {
        type: Sequelize.DataTypes.JSON,
        allowNull: true,
      }
    )
    await queryInterface.changeColumn('email_messages', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('sms_messages', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('telegram_messages', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('email_ops', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('sms_ops', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('telegram_ops', 'params', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
    await queryInterface.changeColumn('campaigns', 's3_object', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
    })
  },
}
