module.exports = async function (): Promise<void> {
  await global.sequelize.close()
}
