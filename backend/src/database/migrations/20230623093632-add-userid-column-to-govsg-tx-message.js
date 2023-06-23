'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_messages_transactional', 'user_id', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
          model: 'users',
          key: 'id',
        },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn('govsg_messages_transactional', 'user_id')
  }
};
