'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('job_queue', 'visible_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now'),
      comment: 'Column Identifier to see if this job is scheduled',
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('job_queue', 'visible_at')
  },
}
