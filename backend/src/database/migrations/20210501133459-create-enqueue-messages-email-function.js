'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'enqueue_messages_email',
      [{ type: 'integer', name: 'jid' }],
      'void',
      'plpgsql',
      `
      -- only one worker will be able to set this job's status
      UPDATE job_queue SET status = 'SENDING', updated_at = clock_timestamp() WHERE id = jid AND status = 'ENQUEUED'
      RETURNING campaign_id INTO selected_campaign_id;
      
      WITH messages AS 
      (
        UPDATE email_messages e
        SET dequeued_at = clock_timestamp(), updated_at = clock_timestamp(), delivered_at = NULL, sent_at = NULL, received_at = NULL, error_code = NULL,
          status = (
            -- marks blacklisted messages by setting their status to INVALID_RECIPIENT,
            -- and resets messages with status=ERROR to status=NULL
            CASE WHEN invalid_recipient IS NULL THEN NULL ELSE 'INVALID_RECIPIENT'::enum_email_messages_status END
          )
        FROM (
          SELECT m.*, b.recipient AS invalid_recipient FROM email_messages m LEFT OUTER JOIN email_blacklist b ON m.recipient = b.recipient
          WHERE
          m.campaign_id = selected_campaign_id
          -- enqueue only those that have not been enqueued - when logger writes the ops back to messages, it will set dequeued_at to null so that messages can be retried.
          AND m.dequeued_at IS NULL
          -- enqueue only unsent or errored messages
          AND (m.status = 'ERROR' OR m.status IS NULL)
        ) as s where e.id = s.id
        RETURNING
        e.id,
        e.campaign_id,
        e.recipient,
        e.params,
        e.dequeued_at,
        e.created_at,
        e.updated_at,
        e.status
      )

      INSERT INTO email_ops
      (id,
      campaign_id,
      recipient,
      params,
      dequeued_at,
      -- note that sent_at is not set. It remains as null so that the sending step will pick it up.
      -- note that delivered_at is not set. It remains as null so we can set it when the sending client responds.
      created_at,
      updated_at)
      (SELECT
        id,
        campaign_id,
        recipient,
        params,
        dequeued_at,
        created_at,
        updated_at
      FROM messages
        -- enqueue only the recipients that are not in the blacklist table
      WHERE status IS NULL );
      `,
      [],
      {
        force: true,
        variables: [{ type: 'int', name: 'selected_campaign_id' }],
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('enqueue_messages_email', [
      { type: 'integer', name: 'jid' },
    ])
  },
}
