# Postman.gov.sg

- [Background](#background)
- [Overview of how messages are sent](#overview-of-how-messages-are-sent)
- [States of a job](#states-of-a-job)
- [Sender worker](#sender-worker)
  - [Conditions for a job to be selected](#conditions-for-a-job-to-be-selected)
  - [Enqueueing](#enqueueing)
  - [Sending](#sending)
- [Logger worker](#logger-worker)
  - [Conditions for a job to be selected](#conditions-for-a-job-to-be-selected-1)
  - [Logging](#logging)
- [Retrying a job](#retrying-a-job)
- [Stopping a job](#stopping-a-job)
- [Priority of jobs](#priority-of-jobs)
- [Other notes](#other-notes)
  - [Why don't we have an enqueue worker?](#why-dont-we-have-an-enqueue-worker)
  - [Why not just use indexes to speed things up?](#why-not-just-use-indexes-to-speed-things-up)
  - [Why should multiple workers work on the same job?](#why-should-multiple-workers-work-on-the-same-job)

## Background

The sending mechanism was designed with three strict considerations in mind:

1. each message is sent exactly once,
2. a sending job can be stopped, and resumed mid-send, and
3. each Twilio/WhatsApp credential can be rate limited strictly. Under-sending (sending at a lower capacity than can be handled by the end client) is preferred to over-sending.

The current iteration involves two types of tables, and two types of workers:

**Tables**

1. _Ground truth_ - these are the `email_messages` and `sms_messages` tables. They contain the messages that are uploaded by users, intended for sending. They can grow larger indefinitely over time.
2. _Ops_ - these are the `email_ops` and `sms_ops` tables. They are used for queueing messages when a user has clicked 'send campaign'. After the messages for that campaign have been sent, they are written back to the ground truth table, and deleted from the ops table. Workers operate on this table.

**Workers**

1. _Sender_ - this worker decides what jobs to start, and sends out messages
2. _Logger_ - this worker finalizes a job by writing records from the ops table to the ground truth table

## Overview of how messages are sent

A user creates a campaign, and associates it with a credential. When 'Send Campaign' is clicked,a job is created in the `job_queue` table. Sender and logger workers continuously poll the `job_queue` table. When a sender worker finds a suitable job, it copies messages from the ground truth table to the ops table (aka _enqueueing_). After enqueueing the messages, it picks off messages from the ops table and sends them, limited by the send rate. When a logger worker finds completed jobs, it copies messages from the ops table back to the ground truth table (aka _finalization_), and deletes those messages from the ops table afterwards.

## States of a job

There are six states that a job can be in.
|Status|Description|
|--|--|
|READY| Initial state |
|ENQUEUED| Chosen by sender worker. Messages are enqueued in ops table|
|SENDING| Sender worker is picking off messages to send|
|SENT| Sender worker has finished picking off all the messages for that campaign to send.|Subject to other conditions, logger worker will try to finalize this job|
|STOPPED|User stopped the job. Logger worker will try to finalize this job|
|LOGGED|Logger worker has finished copying these messages from ops back to ground truth|

## Sender worker

### Conditions for a job to be selected

1. The job for the campaign must be in `READY` state.

2. The credential associated with the campaign

   - must not be also associated with a campaign that is in progress (jobs with the state `ENQUEUED`, `SENDING`, `SENT` or `STOPPED`)

   - unless, the other campaign that is using the credential has the same `campaign_id`, that is, it is the same campaign. This condition allows us to insert multiple jobs for the same `campaign_id` into the job queue, so that multiple workers can send messages for the same campaign simultaneously to attain a higher send_rate.

### Enqueueing

The sender worker picks a job, and tries to set its state to `ENQUEUED`. Since this is a transaction, only one worker can set the state for the same job. Competing workers will fail to commit the transaction and have to roll back.

The winning worker will set `dequeued_at` to the timestamp at that moment, for all the messages for that campaign in the ground truth table, and insert these messages into the ops table.

### Sending

The sender worker picks off `send_rate` messages from the ops table at once, setting `sent_at` to the timestamp when the messages are picked.

For email, sender worker uses Postman's SES credentials. For SMS, sender worker retrieves the campaign's credentials from AWS Secrets Manager.

The hydrated message is sent to the end client (Twilio, SES). Upon receiving a response from the end client, the sender worker updates the message with `delivered_at`. If it is a successful response, it will also set `message_id`, otherwise, it sets `error_code`, and `error_sub_type` if any.

## Logger worker

### Conditions for a job to be selected

The job must be in `SENT` or `STOPPED` state.

- If the job is in `SENT` state, the sender worker has finished sending all the messages to the end client (eg. Twilio, SES). However, it does not mean that the end client has responded to the worker's requests. The logger worker will finalize this job only if **all** the messages in the ops table for this `campaign_id` have `delivered_at` set.

- If the job is in `STOPPED` state, not all the messages were sent. The logger worker will finalize this job only if all the messages in the ops table for this `campaign_id` which have `sent_at` set, also have `delivered_at` set.

### Logging

The logger worker picks a job, and tries to set its state to `LOGGED`. Since this is a transaction, only one worker can set the state for the same job. Competing workers will fail to commit the transaction and have to roll back.

The winning worker will update the ground truth table with the `sent_at`, `delivered_at`, `message_id`, `error_code`, and `error_sub_type` from the ops table, then delete the messages from the ops table for that campaign.

## Retrying a job

We can retry sending messages that were not successfully sent. This is achieved by setting the `dequeued_at` to `NULL` for messages which do not have a `message_id`, then changing the state of the job for that campaign back to `READY`. The next time a sender worker picks up the job, it will only pick these messages that have null `dequeued_at`.

## Stopping a job

Set the state of a job to `STOPPED`. The logger worker will clean it up. Resuming the job is exactly the same as retrying.

## Priority of jobs

The order of jobs in the job queue table determines their priority. The older they are, the higher their priority. It is why we modify the state of job back to `READY` during a retry, instead of creating a new job -- an older job that is retried should be completed before a new job that is inserted.

## Other notes

### Why don't we have an enqueue worker?

Given that it takes time to queue the messages from ground truth into the ops table, it would be great to have a worker doing the enqueueing while the sender worker picks up messages to send. It would speed things up. However this poses several challenges:

- If the enqueue worker is slower than the sending worker, then the sending worker may incorrectly assume that there are no more messages to send. What then would the termination condition be for a logger worker to finalize the job?
- If there are enqueue worker is faster than the sending worker, it might create bias towards new jobs with credentials that are not in use.

### Why not just use indexes to speed things up?

We could. However, we opted for a ground-truth/ops table set up because the ground truth table eventually will grow large enough to slow down any indexes. Indexes also slow down insertion when someone uploads a csv of recipients. That being said, we still need to spend time analyzing the performance of this setup and welcome more enlightened suggestions.

### Why should multiple workers work on the same job?

There is an inherent limit to the number of messages a worker can process per second due to overheads (like updating the db). Our experience is that a worker can at most fire off 200 messages in a second. So if you want a send rate of >200, you need to have more workers working on it simultaneously.
