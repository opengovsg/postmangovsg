'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('campaigns', 'should_bcc_to_me', {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('campaigns', 'should_bcc_to_me')
  },
}
