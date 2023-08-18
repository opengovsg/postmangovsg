'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('govsg_verification', 'passcode_creation_wamid', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('govsg_verification', 'passcode_creation_wamid', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: false,
    })
  }
};
