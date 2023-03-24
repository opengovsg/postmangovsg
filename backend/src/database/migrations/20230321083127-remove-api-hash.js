'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'api_key_hash')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'api_key_hash', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
  }
};
