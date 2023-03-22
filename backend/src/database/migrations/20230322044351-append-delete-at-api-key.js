'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
        'api_keys',
        'deleted_at',
        {
          type: Sequelize.DataTypes.DATE,
          allowNull: true
        }
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('api_keys', 'deleted_at')
  }
};
