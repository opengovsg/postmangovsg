'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.renameColumn('users', 'api_key', 'api_key_hash')
    await queryInterface.createFunction(
      'format_user_on_insert', // actually a misnomer, since activates on UPDATE too, but stick to existing naming
      [],
      'trigger',
      'plpgsql',
      // omit api_key_hash from this trigger as it results in unnecessary coupling
      `
      NEW.email = LOWER(NEW.email);
      RETURN NEW;      
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.renameColumn('users', 'api_key_hash', 'api_key')
    await queryInterface.createFunction(
      'format_user_on_insert',
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
  },
}
