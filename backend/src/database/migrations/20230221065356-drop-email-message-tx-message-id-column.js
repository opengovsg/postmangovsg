'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.removeColumn(
      'email_messages_transactional',
      'message_id'
    )
    // removing this column will lose data irreversibly
    await queryInterface.removeColumn('email_messages', 'message_id')
    await queryInterface.removeColumn('email_ops', 'message_id')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'email_messages_transactional',
      'message_id',
      {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      }
    )
    await queryInterface.addColumn('email_messages', 'message_id', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
    await queryInterface.addColumn('email_ops', 'message_id', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
  },
}
