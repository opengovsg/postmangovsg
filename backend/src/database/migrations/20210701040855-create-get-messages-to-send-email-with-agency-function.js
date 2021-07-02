'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'get_messages_to_send_email_with_agency',
      [
        { type: 'integer', name: 'jid' },
        { type: 'integer', name: 'lim' },
      ],
      'TABLE(result json)',
      'plpgsql',
      `
        RETURN QUERY
        -- Set sent_at for messages belonging to a job that is in SENDING state only (it will not pick up any other states like STOPPED or LOGGED)
        WITH
          selected_ids AS (
            SELECT id FROM email_ops WHERE
            campaign_id = (SELECT q.campaign_id FROM job_queue q WHERE q.id = jid AND status = 'SENDING')
            AND sent_at IS NULL
            LIMIT lim
            FOR UPDATE SKIP LOCKED
          ),
          messages AS (
            UPDATE email_ops SET sent_at=clock_timestamp(), updated_at = clock_timestamp() WHERE
            id in (SELECT * from selected_ids)
            RETURNING id, recipient, params, campaign_id
          )
          SELECT json_build_object(
            'id', m.id,
            'recipient', m.recipient,
            'params', m.params,
            'campaignId', m.campaign_id,
            'body', t.body,
            'subject', t.subject,
            'replyTo', t.reply_to,
            'from', t.from,
            'senderEmail', u.email,
            'agencyName', a.name,
            -- if show_logo is disabled for template, don't return an agency logo
            'agencyLogoURI', 
              CASE t.show_logo 
                WHEN TRUE THEN a.logo_uri
                ELSE NULL
              END
          )
          FROM messages m
          INNER JOIN email_templates t ON m.campaign_id = t.campaign_id
          INNER JOIN campaigns c ON c.id = m.campaign_id
          INNER JOIN users u ON u.id = c.user_id
          LEFT JOIN domains d ON d.domain = u.email_domain
          LEFT JOIN agencies a ON a.id = d.agency_id;

        -- An edge case exists where the status of a job is set to 'SENT', but the sending client hasn't responded to all the sent messages
        -- In that case, finalization of the job has to be deferred, so that the response can be updated in the ops table
        -- The check for this edge case is carried out in the log_next_job function. 
        IF NOT FOUND THEN
          UPDATE job_queue SET status = 'SENT', updated_at = clock_timestamp() where id = jid AND status = 'SENDING';
        END IF;
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction(
      'get_messages_to_send_email_with_agency',
      [
        { type: 'integer', name: 'jid' },
        { type: 'integer', name: 'lim' },
      ]
    )
  },
}
