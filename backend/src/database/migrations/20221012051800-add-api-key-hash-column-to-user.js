'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'api_key_hash', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
    await queryInterface.createFunction(
      'sync_api_key_with_api_key_hash',
      [],
      'trigger',
      'plpgsql',
      `
      NEW.api_key_hash = NEW.api_key;
      RETURN NEW;
      `,
      [],
      { force: true }
    )
    // this trigger is needed to ensure that any users that generate new api keys AFTER the backfill will be synced to api_key_hash
    await queryInterface.sequelize.query(
      'CREATE TRIGGER sync_api_key_with_api_key_hash_trigger BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE sync_api_key_with_api_key_hash();'
    )
    await queryInterface.sequelize.query(
      'UPDATE users SET api_key_hash = api_key;'
    )
    await queryInterface.createFunction(
      'format_user_email',
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
      'CREATE TRIGGER format_user_email_on_change_trigger BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE format_user_email();'
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTrigger(
      'users',
      'format_user_email_on_change_trigger'
    )
    await queryInterface.dropFunction('format_user_email', [])
    await queryInterface.dropTrigger(
      'users',
      'sync_api_key_with_api_key_hash_trigger'
    )
    await queryInterface.dropFunction('sync_api_key_with_api_key_hash', [])
    await queryInterface.removeColumn('users', 'api_key_hash')
  },
}
