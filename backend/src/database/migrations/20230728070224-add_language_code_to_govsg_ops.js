'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_ops', 'language_code', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'en_GB',
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('govsg_ops', 'language_code')
  },
}
