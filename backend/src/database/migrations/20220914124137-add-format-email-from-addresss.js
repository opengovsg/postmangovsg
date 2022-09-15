'use strict';

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'format_email_from_address',
      [],
      'trigger',
      'plpgsql',
      `
      NEW.email = LOWER(NEW.email);
      RETURN NEW;      
      `,
      [],
      { force: true }
    )
    await queryInterface.sequelize.query(
      "CREATE TRIGGER format_email_from_address_trigger BEFORE INSERT OR UPDATE ON email_from_address FOR EACH ROW EXECUTE PROCEDURE format_email_from_address()"
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.sequelize.query("DROP TRIGGER format_email_from_address_trigger ON email_from_address")
    await queryInterface.dropFunction('format_email_from_address', [])
  }
};
