'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'telegram_subscribers',
        {
          phone_number: {
            type: Sequelize.DataTypes.STRING(255),
            allowNull: false,
            primaryKey: true,
          },
          telegram_id: {
            type: Sequelize.DataTypes.BIGINT,
            allowNull: false,
            unique: 'telegram_subscribers_telegram_id_key',
          },
          created_at: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction }
      )

      await queryInterface.addIndex('telegram_subscribers', ['telegram_id'], {
        transaction,
        name: 'telegram_subscribers_telegram_id_key',
        unique: true,
      })
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('telegram_subscribers')
  },
}
