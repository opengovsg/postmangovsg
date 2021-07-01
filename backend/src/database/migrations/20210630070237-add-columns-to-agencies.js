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
    await queryInterface.removeConstraint('agencies', 'agencies_id_key')
    await queryInterface.removeColumn('agencies', 'id')
    await queryInterface.removeColumn('agencies', 'name')
    await queryInterface.removeColumn('agencies', 'logo_uri')

    await queryInterface.changeColumn('agencies', 'domain', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: false,
    })
    await queryInterface.addConstraint('agencies', {
      fields: ['domain'],
      type: 'primary key',
      name: 'agencies_pkey',
    })
  },
}
