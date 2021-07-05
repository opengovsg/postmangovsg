'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'update_stats_telegram',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status IS NULL) AS unsent,
    COUNT(*) FILTER (WHERE status = 'ERROR') AS errored,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') AS sent,
    COUNT(*) FILTER (WHERE status = 'INVALID_RECIPIENT') AS invalid
  FROM telegram_messages
  WHERE campaign_id = selected_campaign_id
)
INSERT INTO statistics (campaign_id, unsent, errored, invalid, sent, updated_at, created_at)
SELECT selected_campaign_id, unsent, errored, invalid, sent, now(), now()
FROM stats
ON CONFLICT (campaign_id) DO UPDATE
SET
  unsent = excluded.unsent,
  errored = excluded.errored,
  invalid = excluded.invalid,
  sent = excluded.sent,
  updated_at = excluded.updated_at;
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('update_stats_telegram', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
