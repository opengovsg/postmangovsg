'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'rate_limit', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10, // 10 requests per second
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn('users', 'rate_limit')
  },
}
