'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('email_templates', 'show_logo', {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: true,
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn('email_templates', 'show_logo')
  },
}
