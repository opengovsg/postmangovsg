-- Checks if any other job is running with the same credential, but with a different campaign_id
CREATE OR REPLACE FUNCTION is_credential_used(campaignId integer) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE result BOOLEAN;
BEGIN
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
END $$;
