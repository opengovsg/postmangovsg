'use strict'

const { Sequelize } = require('sequelize')

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.addColumn('statistics', 'read', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
    })
    await queryInterface.createFunction(
      'update_stats_govsg',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
-- Archive number of unsent, errored and sent govsg messages in statistics table
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'UNSENT') AS unsent,
    COUNT(*) FILTER (WHERE status = 'ERROR') AS errored,
    COUNT(*) FILTER (WHERE status = 'ACCEPTED' OR status = 'SENT' or status = 'DELIVERED') AS sent,
    COUNT(*) FILTER (WHERE status = 'INVALID_RECIPIENT') AS invalid,
    COUNT(*) FILTER (WHERE status = 'READ' OR status = 'DELETED') AS read
  FROM govsg_messages
  WHERE campaign_id = selected_campaign_id
)
INSERT INTO statistics (campaign_id, unsent, errored, invalid, sent, read, updated_at, created_at)
SELECT selected_campaign_id, unsent, errored, invalid, sent, read, now(), now() FROM stats
ON CONFLICT (campaign_id) DO UPDATE
SET
  unsent = excluded.unsent,
  errored = excluded.errored,
  sent = excluded.sent,
  invalid = excluded.invalid,
  read = excluded.read,
  updated_at = excluded.updated_at;
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('update_stats_govsg', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
    await queryInterface.removeColumn('statistics', 'read')
  },
}
