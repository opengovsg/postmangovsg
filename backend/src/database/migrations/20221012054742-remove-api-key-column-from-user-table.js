'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.removeColumn('users', 'api_key')
    await queryInterface.sequelize.query(
      'DROP TRIGGER sync_api_key_with_api_key_hash_trigger ON users;'
    )
    await queryInterface.dropFunction('sync_api_key_with_api_key_hash', [])
  },

  down: async (queryInterface, Sequelize) => {
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
    await queryInterface.sequelize.query(
      'CREATE TRIGGER sync_api_key_with_api_key_hash_trigger BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE sync_api_key_with_api_key_hash();'
    )
    await queryInterface.addColumn('users', 'api_key', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })
    await queryInterface.sequelize.query(
      'UPDATE users SET api_key = api_key_hash;'
    )
  },
}
