-- Called by the core.log_next_job() function
CREATE OR REPLACE FUNCTION log_job_email(selected_campaign_id int) RETURNS VOID
 LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE email_messages m 
	SET dequeued_at = p.dequeued_at,
    -- coalesced fields should prioritise message table over ops table 
    -- because callbacks might arrive before logging
		error_code = COALESCE(m.error_code, p.error_code),
    status = COALESCE(m.status, p.status),
		message_id = p.message_id,
		sent_at = p.sent_at,
		delivered_at = p.delivered_at,
		received_at = COALESCE(m.received_at, p.received_at),
		updated_at = clock_timestamp() 
	FROM email_ops p WHERE 
	p.campaign_id = selected_campaign_id 
	AND m.campaign_id = p.campaign_id
	AND m.recipient = p.recipient;

	DELETE FROM email_ops p WHERE  p.campaign_id = selected_campaign_id;

  PERFORM update_stats_email(selected_campaign_id);
END $$