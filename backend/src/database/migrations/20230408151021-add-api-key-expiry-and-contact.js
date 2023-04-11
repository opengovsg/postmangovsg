'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('api_keys', 'valid_until', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date('2024-04-21T00:00:00.000Z'),
    })
    await queryInterface.addColumn('api_keys', 'notification_addresses', {
      type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.STRING(255)),
      // we're enforcing not-null only for new keys via application logic
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('api_keys', 'notification_addresses')
    await queryInterface.removeColumn('api_keys', 'valid_until')
  },
}
