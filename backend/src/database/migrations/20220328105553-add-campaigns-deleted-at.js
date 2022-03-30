'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'campaigns',
      'deleted_at',
      {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      }
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('campaigns', 'deleted_at')
  }
};
