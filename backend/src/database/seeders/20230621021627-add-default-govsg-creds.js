'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.bulkInsert('credentials', [
      {
        name: 'GOVSG_DEFAULT',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  },

  down: async (queryInterface, _) => {
    await queryInterface.bulkDelete('credentials', {
      name: 'GOVSG_DEFAULT',
    })
  },
}
