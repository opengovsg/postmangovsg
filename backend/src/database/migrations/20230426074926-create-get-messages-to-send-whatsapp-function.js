'use strict';

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
        'get_messages_to_send_whatsapp',
        [
          { type: 'integer', name: 'jid'},
          { type: 'integer', name: 'lim'},
        ],
        'TABLE(result json)',
        'plpgsql',
        `
        CREATE OR REPLACE FUNCTION public.get_messages_to_send_whatsapp(jid integer, lim integer)
 RETURNS TABLE(result json)
 LANGUAGE plpgsql
AS $function$  BEGIN 
        RETURN QUERY
        -- Set sent_at for messages belonging to a job that is in SENDING state only (it will not pick up any other states like STOPPED or LOGGED)
        WITH
          selected_ids AS (
            SELECT id FROM whatsapp_ops WHERE
            campaign_id = (SELECT q.campaign_id FROM job_queue q WHERE q.id = jid AND status = 'SENDING')
            AND sent_at IS NULL
            LIMIT lim
            FOR UPDATE SKIP LOCKED
          ),
          messages AS (
            UPDATE whatsapp_ops SET sent_at=clock_timestamp(), updated_at = clock_timestamp() WHERE
            id in (SELECT * from selected_ids)
            RETURNING id, recipient, params, campaign_id
          )
          SELECT json_build_object('id', m.id, 'recipient', m.recipient, 'params', m.params, 'body', t.body, 'campaignId', m.campaign_id)
          FROM messages m, whatsapp_templates t
          WHERE m.campaign_id = t.campaign_id;

        -- If there are no messages found, we assume the job is done\t
        -- This is only correct because enqueue and send are serialized. All messages are enqueued before sending occurs
        -- An edge case exists where the status of a job is set to 'SENT', but the sending client hasn't responded to all the sent messages
        -- In that case, finalization of the job has to be deferred, so that the response can be updated in the ops table
        -- The check for this edge case is carried out in the log_job_<channel> function. 
        IF NOT FOUND THEN
          UPDATE job_queue SET status = 'SENT', updated_at = clock_timestamp() where id = jid AND status = 'SENDING';
        END IF;
       END; $function$
`, [], { force: true}
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('get_messages_to_send_whatsapp', [
      { type: 'integer', name: 'jid'},
      { type: 'integer', name: 'lim'},
    ])
  }
};
