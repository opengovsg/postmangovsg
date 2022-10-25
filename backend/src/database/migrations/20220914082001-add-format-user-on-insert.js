'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    // NB superseded by 20221012051800-add-api-key-hash-column-to-user.js
    await queryInterface.createFunction(
      'format_user_on_insert', // actually a misnomer, since activates on UPDATE too, but stick to existing naming
      [],
      'trigger',
      'plpgsql',
      `
      NEW.email = LOWER(NEW.email);
      NEW.api_key = CASE WHEN NEW.api_key='' THEN NULL ELSE NEW.api_key END;
      RETURN NEW;      
      `,
      [],
      { force: true }
    )
    await queryInterface.sequelize.query(
      'CREATE TRIGGER format_user_trigger BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE format_user_on_insert();'
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.sequelize.query(
      'DROP TRIGGER format_user_trigger ON users;'
    )
    await queryInterface.dropFunction('format_user_on_insert', [])
  },
}
