'use strict';

const {MessageStatus} = require('@core/constants');
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('sms_messages_transactional', 'status', {
            type: Sequelize.DataTypes.ENUM(
                Object.values(MessageStatus)
            ),
            allowNull: false,
            defaultValue: MessageStatus.Success
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
