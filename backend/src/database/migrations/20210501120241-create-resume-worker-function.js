'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'resume_worker',
      [{ type: 'text', name: 'worker' }],
      'void',
      'plpgsql',
      `
    -- Find a job that this worker was running and reset it so someone else can pick it up
    UPDATE job_queue q SET status = 'READY', worker_id = NULL, updated_at = clock_timestamp() WHERE worker_id = worker;
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('resume_worker', [
      { type: 'text', name: 'worker' },
    ])
  },
}
