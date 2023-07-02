'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_templates', 'param_metadata', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: true,
    })
    await queryInterface.addColumn(
      'campaign_govsg_template',
      'for_single_recipient',
      {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('govsg_templates', 'param_metadata')
    await queryInterface.removeColumn(
      'campaign_govsg_template',
      'for_single_recipient'
    )
  },
}
