# 📊 SMS Statistics

The campaign dashboard shows you all the campaigns that you have sent in the past.

<figure><img src="../../.gitbook/assets/Screenshot 2022-11-15 at 3.30.53 PM.png" alt=""><figcaption></figcaption></figure>

You can click into your campaign to see the breakdown of the summary stats.

You can also download the campaign delivery report, which gives you a more detailed view on the status of each recipient number.&#x20;

<figure><img src="../../.gitbook/assets/Screenshot 2022-11-15 at 3.40.47 PM.png" alt=""><figcaption></figcaption></figure>

## Types of Status for SMS

SMS campaigns would generate two types of status:

{% hint style="info" %}
1. **SENT**:  Your SMS was successfully delivered to the recipient.
2. **ERROR**: The mobile number was not valid. See error code descriptions for more details.
{% endhint %}

Unlike emails, you generally would not have any **INVALID** status. To see the entire list of SMS errors, you need to click on the `Export` button on the campaign landing page.&#x20;

### Twilio Sending Status

| [**Queue**](https://support.twilio.com/hc/en-us/articles/223134347-What-are-the-Possible-SMS-and-MMS-Message-Statuses-and-What-do-They-Mean-)   | <p>Twilio has received your request to create the message. All new messages sent from a specific Twilio phone number are created with a status of queued.</p><p></p><p><strong>Action</strong>: Wait</p><p>*If the message has been stuck in the <strong>queue</strong> state for > 2 hours, please email postman@open.gov.sg for additional assistance. </p> |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Sending**](https://support.twilio.com/hc/en-us/articles/223134347-What-are-the-Possible-SMS-and-MMS-Message-Statuses-and-What-do-They-Mean-) | <p>Twilio is in the process of sending the message. This status is usually only present for a very short time.</p><p></p><p><strong>Action</strong>: Wait</p>                                                                                                                                                                                                 |
| [**Sent**](https://support.twilio.com/hc/en-us/articles/223134347-What-are-the-Possible-SMS-and-MMS-Message-Statuses-and-What-do-They-Mean-)    | <p>Twilio has received a confirmation from our Super Network partner advising they have accepted the message.</p><p></p><p><strong>Action:</strong> Nothing, the SMS has been sent.</p>                                                                                                                                                                       |

### Error Codes Interpretation in Postman

| Error Codes                                                      | Description & Follow-up Action                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invalid phone numbers**                                        | <p>Invalid phone number in the recipient column. No real human is using these mobile numbers. </p><p></p><p><strong>Action</strong>: Please remove these mobile numbers from your database.</p> |
| [**Twilio error codes**](https://www.twilio.com/docs/api/errors) | <p>SMS encountered Twilio error codes of xxx. </p><p></p><p><strong>Action</strong>: Please visit <a href="https://www.twilio.com/docs/api/errors">Twilio's error codes</a> for more info. </p> |
