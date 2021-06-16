CREATE OR REPLACE FUNCTION get_messages_to_send_email(jid int, lim int)
RETURNS TABLE (result json)
LANGUAGE plpgsql AS $$
BEGIN
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
      'agencyName', a.name,
      'agencyLogoURI', a.logo_uri,
      'senderEmail', u.email
    )
    FROM messages m
    INNER JOIN email_templates t ON t.campaign_id = m.campaign_id
    LEFT JOIN campaigns c ON c.id = m.campaign_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN domains d ON d.domain = u.email_domain
    LEFT JOIN agencies a ON a.id = d.agency_id;
    
  -- If there are no messages found, we assume the job is done
  -- This is only correct because enqueue and send are serialized. All messages are enqueued before sending occurs

  -- If there are no messages found, we assume the job is done
  -- This is only correct because enqueue and send are serialized. All messages are enqueued before sending occurs

  -- An edge case exists where the status of a job is set to 'SENT', but the sending client hasn't responded to all the sent messages
  -- In that case, finalization of the job has to be deferred, so that the response can be updated in the ops table
  -- The check for this edge case is carried out in the log_next_job function.
  IF NOT FOUND THEN
    UPDATE job_queue SET status = 'SENT', updated_at = clock_timestamp() where id = jid AND status = 'SENDING';
  END IF;
END $$;
