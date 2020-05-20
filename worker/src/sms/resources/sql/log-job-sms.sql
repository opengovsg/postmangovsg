-- Called by the core.log_next_job() function
CREATE OR REPLACE FUNCTION log_job_sms(selected_campaign_id int) RETURNS VOID
 LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE sms_messages m 
	SET dequeued_at = p.dequeued_at,
		error_code = p.error_code,
		message_id = p.message_id,
		sent_at = p.sent_at,
		delivered_at = p.delivered_at,
		received_at = p.received_at,
		updated_at = clock_timestamp() 
	FROM sms_ops p WHERE 
	p.campaign_id = selected_campaign_id 
	AND m.campaign_id = p.campaign_id
	AND m.recipient = p.recipient;

	DELETE FROM sms_ops p WHERE  p.campaign_id = selected_campaign_id;
END $$