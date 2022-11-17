'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('campaigns', 'visible_at', {
      type: Sequelize.DATE,
      // we allow null for campaigns table but not for job queue as the job queue trigger is reading,
      // and it must have value since its db routine
      // the campaigns visible at is purely for reference and in-code checks
      allowNull: true,
      comment: 'Column Identifier to see if this job is scheduled',
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('campaigns', 'visible_at')
  },
}
