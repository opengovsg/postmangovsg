'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_email_messages_status ADD VALUE 'READ';"
    )
  },
}
