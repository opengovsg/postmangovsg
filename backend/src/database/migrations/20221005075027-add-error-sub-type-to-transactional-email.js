'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'email_messages_transactional',
      'error_sub_type',
      {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn(
      'email_messages_transactional',
      'error_sub_type'
    )
  },
}
