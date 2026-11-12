'use strict';

// Inlined so migrations run without building and configuring the app
const TransactionalEmailClassification = {
  Urgent: 'URGENT',
  ForAction: 'FOR_ACTION',
  ForInfo: 'FOR_INFO',
}

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
