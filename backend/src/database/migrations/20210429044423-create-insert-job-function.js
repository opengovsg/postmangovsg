'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'insert_job',
      [
        { type: 'integer', name: 'selected_campaign_id' },
        { type: 'integer', name: 'selected_send_rate' },
        { type: 'integer', direction: 'OUT', name: 'selected_job_id' },
      ],
      'integer',
      'plpgsql',
      `
INSERT INTO job_queue ("campaign_id", "send_rate", "status", "created_at", "updated_at")
VALUES (selected_campaign_id, selected_send_rate, 'READY', clock_timestamp(), clock_timestamp())
RETURNING id INTO selected_job_id;
`,
      [],
      {
        force: true,
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('insert_job', [
      { type: 'integer', name: 'selected_campaign_id' },
      { type: 'integer', name: 'selected_send_rate' },
      { type: 'integer', direction: 'OUT', name: 'selected_job_id' },
    ])
  },
}
