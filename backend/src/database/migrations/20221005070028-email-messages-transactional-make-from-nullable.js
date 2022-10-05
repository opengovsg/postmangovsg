'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      'email_messages_transactional',
      'from_name'
    )
    await queryInterface.removeColumn(
      'email_messages_transactional',
      'from_address'
    )
    await queryInterface.addColumn('email_messages_transactional', 'from', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('email_messages_transactional', 'from')

    // not possible to revert these 2 columns to the exact equivalents as the up
    // migration is lossy
    await queryInterface.addColumn(
      'email_messages_transactional',
      'from_name',
      {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'email_messages_transactional',
      'from_address',
      {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      }
    )
  },
}
