'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.addColumn('govsg_messages', 'recipient_name', Sequelize.DataTypes.STRING, { transaction })
      await queryInterface.sequelize.query(`
        UPDATE govsg_messages
        SET recipient_name = params->>'recipient_name';
      `, { transaction });
      transaction.commit()
    } catch (e) {
      transaction.rollback()
      throw e
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.removeColumn('govsg_messages', 'recipient_name')
      transaction.commit()
    } catch (e) {
      transaction.rollback()
      throw e
    }
  },
};
