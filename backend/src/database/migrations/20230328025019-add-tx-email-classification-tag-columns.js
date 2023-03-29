'use strict';

const { TransactionalEmailClassification } = require('@email/models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
        'email_messages_transactional',
        'classification',
        {
          type: Sequelize.DataTypes.ENUM(
          Object.values(TransactionalEmailClassification)
        ),
          allowNull: true
        }
    )
    await queryInterface.addColumn(
      'email_messages_transactional',
      'tag',
      {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn('email_messages_transactional', 'classification')
    await queryInterface.removeColumn('email_messages_transactional', 'tag')
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_email_messages_transactional_classification";'
    )
  }
};
