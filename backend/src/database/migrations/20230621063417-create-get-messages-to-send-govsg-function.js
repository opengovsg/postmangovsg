'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'get_messages_to_send_govsg',
      [
        { type: 'integer', name: 'jid' },
        { type: 'integer', name: 'lim' },
      ],
      'TABLE(result json)',
      'plpgsql',
      `
        RETURN QUERY
        -- Set send_attempted_at for messages belonging to a job that is in SENDING state only (it will not pick up any other states like STOPPED or LOGGED)
        WITH
        campaignId AS (
          SELECT q.campaign_id FROM job_queue q WHERE q.id = jid AND status = 'SENDING'
        ),
        selected_ids AS (
          SELECT id FROM govsg_ops WHERE
          campaign_id in (SELECT * FROM campaignId)
          AND send_attempted_at IS NULL
          LIMIT lim
          FOR UPDATE SKIP LOCKED
        ),
        messages AS (
          UPDATE govsg_ops SET send_attempted_at=clock_timestamp(), updated_at = clock_timestamp() WHERE
          id in (SELECT * from selected_ids)
          RETURNING id, recipient, params, campaign_id
        ),
        templates AS (
          SELECT govsg_templates.whatsapp_template_label as whatsapp_template_label, campaign_govsg_template.campaign_id  as campaign_id, govsg_templates.params as param_order
          from govsg_templates JOIN campaign_govsg_template ON govsg_templates.id = campaign_govsg_template.govsg_template_id 
          where govsg_templates.id in (SELECT govsg_template_id from campaign_govsg_template where campaign_id in (SELECT * FROM campaignId))
        )
        SELECT json_build_object('id', m.id, 'recipient', m.recipient, 'params', m.params, 'paramOrder', t.param_order, 'whatsappTemplateLabel', t.whatsapp_template_label, 'campaignId', m.campaign_id)
        FROM messages m, templates t
        WHERE m.campaign_id = t.campaign_id;

        -- If there are no messages found, we assume the job is done	
        -- This is only correct because enqueue and send are serialized. All messages are enqueued before sending occurs
        -- An edge case exists where the status of a job is set to 'SENT', but the sending client hasn't responded to all the sent messages
        -- In that case, finalization of the job has to be deferred, so that the response can be updated in the ops table
        -- The check for this edge case is carried out in the log_job_<channel> function. 
        IF NOT FOUND THEN
          UPDATE job_queue SET status = 'SENT', updated_at = clock_timestamp() where id = jid AND status = 'SENDING';
        END IF;
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('get_messages_to_send_govsg', [
      { type: 'integer', name: 'jid' },
      { type: 'integer', name: 'lim' },
    ])
  },
}
