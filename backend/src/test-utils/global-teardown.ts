module.exports = async function () {
  await global.sequelize.close()
}
