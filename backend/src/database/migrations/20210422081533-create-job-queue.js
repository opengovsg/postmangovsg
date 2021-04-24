'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('job_queue', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      worker_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
        references: {
          model: 'workers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      send_rate: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.ENUM(
          'READY',
          'ENQUEUED',
          'SENDING',
          'SENT',
          'STOPPED',
          'LOGGED'
        ),
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

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('job_queue')
  },
}
