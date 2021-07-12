'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'email_domain', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
      references: { model: 'domains', key: 'domain' },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn('users', 'email_domain')
  },
}
