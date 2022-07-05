'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'is_credential_used',
      [{ type: 'integer', name: 'campaignId' }],
      'boolean',
      'plpgsql',
      `
    SELECT TRUE INTO result_non_email 
    FROM job_queue j, campaigns c1 WHERE
    j.campaign_id = c1.id 
    --  campaigns that share the same credential as this campaign
    AND c1.cred_name = (SELECT c.cred_name FROM campaigns c WHERE c.id = campaignId LIMIT 1)
     -- whose status indicates that they are running
    AND j.status NOT IN ('READY','LOGGED')
    --  but they are not this campaign
    AND j.campaign_id <> campaignId
    AND c1.type <> 'EMAIL'
    LIMIT 1;

    SELECT count(*) INTO count_email_campaign_using
    FROM campaigns c1 WHERE 
    c1.id <> campaignId
    AND c1.cred_name = (SELECT c.cred_name FROM campaigns c WHERE c.id = campaignId LIMIT 1)
    AND c1.type = 'EMAIL';

    SELECT
      CASE 
        WHEN result_non_email IS TRUE THEN TRUE
        WHEN count_email_campaign_using >= 2 THEN TRUE
        ELSE NULL
      END INTO result;
    
    RETURN result;
`,
      [],
      {
        force: true,
        variables: [
          { type: 'boolean', name: 'result' },
          { type: 'boolean', name: 'result_non_email' },
          { type: 'integer', name: 'count_email_campaign_using' },
        ],
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('is_credential_used', [
      { type: 'integer', name: 'campaignId' },
    ])
  },
}
