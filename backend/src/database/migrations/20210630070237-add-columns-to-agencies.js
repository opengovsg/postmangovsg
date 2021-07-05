'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('agencies', 'agencies_pkey')
    await queryInterface.changeColumn('agencies', 'domain', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    })

    await queryInterface.addColumn('agencies', 'id', {
      autoIncrement: true,
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
    })
    await queryInterface.addColumn('agencies', 'name', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('agencies', 'logo_uri', {
      type: Sequelize.DataTypes.TEXT,
    })
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the whole table and re-create it, as NULL values for domain are
    // not valid for the previous schema anyway
    await queryInterface.dropTable('agencies')
    await queryInterface.createTable('agencies', {
      domain: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
  },
}
