'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('user_credentials', {
      unique: true,
      name: 'uuid_unique_after_06-09-2023',
      fields: ['cred_name','created_at'],
      where: {
          created_at: {
            [Sequelize.Op.gte]: new Date('2023-09-06')
          } 
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('user_credentials', 'uuid_unique_after_06-09-2023')
  }
};
