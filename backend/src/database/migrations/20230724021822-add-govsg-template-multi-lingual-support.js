'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_templates', 'multilingual_support', {
      type: Sequelize.DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    })
    await queryInterface.addColumn('govsg_messages', 'language_code', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'en_GB',
    })
    await queryInterface.addColumn(
      'govsg_messages_transactional',
      'language_code',
      {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'en_GB',
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('govsg_templates', 'multilingual_support')
    await queryInterface.removeColumn('govsg_messages', 'language_code')
    await queryInterface.removeColumn(
      'govsg_messages_transactional',
      'language_code'
    )
  },
}
