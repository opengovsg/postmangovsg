'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.addConstraint('users', {
      fields: ['email'],
      type: 'unique',
      name: 'users_email_unique_key',
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeConstraint('users', 'users_email_unique_key')
  },
}
