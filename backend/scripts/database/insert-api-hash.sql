-- Copy and paste this into the sql query.
-- Make sure to change the values ie: 'HASH', 'EMAIL'

INSERT INTO api_keys("hash", "email", "created_at", "updated_at")
VALUES('HASH', 'EMAIL', clock_timestamp(), clock_timestamp())