'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.sequelize.query('ALTER TABLE govsg_verification DROP CONSTRAINT govsg_verification_govsg_message_id_fkey', { transaction })
      await queryInterface.sequelize.query(`ALTER TABLE govsg_verification ADD CONSTRAINT govsg_verification_govsg_message_id_fkey
        FOREIGN KEY(govsg_message_id) REFERENCES govsg_messages (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`, { transaction })
      transaction.commit()
    } catch (e) {
      transaction.rollback()
      throw e
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.sequelize.query('ALTER TABLE govsg_verification DROP CONSTRAINT govsg_verification_govsg_message_id_fkey', { transaction })
      await queryInterface.sequelize.query(`ALTER TABLE govsg_verification ADD CONSTRAINT govsg_verification_govsg_message_id_fkey
        FOREIGN KEY(govsg_message_id) REFERENCES govsg_messages (id)
        ON UPDATE CASCADE`, { transaction })
      transaction.commit()
    } catch (e) {
      transaction.rollback()
      throw e
    }
  },
};
