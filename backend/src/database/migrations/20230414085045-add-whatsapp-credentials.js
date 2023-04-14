'use strict';

const {ChannelType} = require('@core/constants');
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('domain_credentials', {
      domain: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'domains',
          key: 'domain',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      label: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      cred_name: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: Sequelize.DataTypes.ENUM(...Object.values(ChannelType)),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('domain_credentials')
  }
};
