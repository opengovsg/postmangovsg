'use strict';

// Inlined so migrations run without building and configuring the app
const TransactionalSmsMessageStatus = {
  Unsent: 'UNSENT',
  Accepted: 'ACCEPTED',
  Sent: 'SENT',
  Delivered: 'DELIVERED',
  Error: 'ERROR',
};
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('sms_messages_transactional', 'status', {
            type: Sequelize.DataTypes.ENUM(
                Object.values(TransactionalSmsMessageStatus)
            ),
            allowNull: false,
            defaultValue: TransactionalSmsMessageStatus.Unsent
        });
        await queryInterface.addColumn('sms_messages_transactional', 'error_code', {
            allowNull: true,
            type: Sequelize.DataTypes.STRING(255),
        })
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('sms_messages_transactional', 'status')
        await queryInterface.removeColumn('sms_messages_transactional', 'error_code')
        await queryInterface.sequelize.query(
            'DROP TYPE "enum_sms_messages_transactional_status";'
        )
    }
};
