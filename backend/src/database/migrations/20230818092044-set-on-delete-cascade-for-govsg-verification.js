'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('govsg_verification', 'govsg_message_id', {
      type: Sequelize.DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'govsg_messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('govsg_verification', 'govsg_message_id', {
      type: Sequelize.DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'govsg_messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
    })
  }
};
