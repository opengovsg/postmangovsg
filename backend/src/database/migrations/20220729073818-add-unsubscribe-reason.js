'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('unsubscribers', 'reason', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('unsubscribers', 'deleted_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('unsubscribers', 'deleted_at')
    await queryInterface.removeColumn('unsubscribers', 'reason')
  },
}
