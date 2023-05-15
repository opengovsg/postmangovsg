'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
        "ALTER TYPE enum_campaigns_type ADD VALUE 'WHATSAPP';"
    )
  },
};
