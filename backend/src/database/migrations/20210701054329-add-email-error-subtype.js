'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn(
      'email_messages', // name of Source model
      'error_sub_type', // name of column we're adding
      {
        type: Sequelize.STRING(255),
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'email_ops', // name of Source model
      'error_sub_type', // name of column we're adding
      {
        type: Sequelize.STRING(255),
        allowNull: true,
      }
    )
  },

  down: async (queryInterface, _) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn(
      'email_messages', // name of Source Model
      'error_sub_type' // name of column we want to remove
    )
    await queryInterface.removeColumn(
      'email_ops', // name of Source Model
      'error_sub_type' // name of column we want to remove
    )
  },
}
