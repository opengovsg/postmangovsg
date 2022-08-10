'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      // NOTE: THIS FILE IS OUTDATED PLEASE SEE MORE RECENT MIGRATIONS
      'is_credential_used',
      [{ type: 'integer', name: 'campaignId' }],
      'boolean',
      'plpgsql',
      `
    SELECT TRUE INTO result 
    FROM job_queue j, campaigns c1 WHERE
    j.campaign_id = c1.id 
    --  campaigns that share the same credential as this campaign
    AND c1.cred_name = (SELECT c.cred_name FROM campaigns c WHERE c.id = campaignId LIMIT 1)
     -- whose status indicates that they are running
    AND j.status NOT IN ('READY','LOGGED')
    --  but they are not this campaign
    AND j.campaign_id <> campaignId
    LIMIT 1;
    RETURN result;
`,
      [],
      {
        force: true,
        variables: [{ type: 'boolean', name: 'result' }],
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('is_credential_used', [
      { type: 'integer', name: 'campaignId' },
    ])
  },
}
