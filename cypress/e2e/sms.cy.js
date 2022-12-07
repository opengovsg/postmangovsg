describe("SMS Test", () => {
  it("initiate sms campaign", () => {
    // have these vars here so it won't affect retry results
    // (e.g. messages received from previous try being counted in the latest one
    // as they share the same content)
    const MODE = 'sms';
    const CSV_FILENAME = 'testfile_sms.csv';
    const NUM_RECIPIENTS = '1';
    const TWILIO_CRED_SAVED = 'default-postman';

    const CUR_DATE = new Date();
    const DATETIME =
      CUR_DATE.getDate() +
      '/' +
      (CUR_DATE.getMonth() + 1) +
      '/' +
      CUR_DATE.getFullYear() +
      '@' +
      CUR_DATE.getHours() +
      ':' +
      CUR_DATE.getMinutes() +
      ':' +
      CUR_DATE.getSeconds();
    const CAMPAIGN_NAME = MODE.concat('_').concat(DATETIME);
    const RANDOM_STRING = '_'.concat(
      Math.floor(Math.random() * 1000000 + 1).toString(),
    );
    const MSG_CONTENT = Cypress.env('MSG_CONTENT').concat(RANDOM_STRING);
    const MSG_TO_VERIFY = Cypress.env('MSG_TO_VERIFY').concat(RANDOM_STRING);

    const OTP_SUBJECT = Cypress.env('OTP_SUBJECT');
    const EMAIL = Cypress.env('EMAIL');
    const MAIL_SENDER = Cypress.env('MAIL_SENDER');
    const SMS_NUMBER = Cypress.env('SMS_NUMBER');
    const TWILIO_ACC_SID = Cypress.env('TWILIO_ACC_SID');
    const TWILIO_AUTH_TOKEN = Cypress.env('TWILIO_AUTH_TOKEN');
    const WAIT_TIME = Cypress.env('WAIT_TIME');
    const REPORT_WAIT_TIME = Cypress.env('REPORT_WAIT_TIME');

    const MSG_TO_SEARCH = 15;
    const MSG_TO_EXPECT = 2; //both test and actual sms

    //write csv test file
    const CSV_CONTENT = 'recipient,name\n' + SMS_NUMBER + ',postman';
    cy.writeFile('cypress/fixtures/'.concat(CSV_FILENAME), CSV_CONTENT);

    //log in via OTP
    cy.visit('/login');
    cy.get('input[type=email]').type(EMAIL);
    cy.get('button[type=submit]').click();
    cy.wait(WAIT_TIME);

    cy.task('gmail:check', {
      from: MAIL_SENDER,
      to: EMAIL,
      subject: OTP_SUBJECT,
    }).then((email) => {
      assert.isNotNull(email, 'Email was not found');
      const EMAIL_CONTENT = email[0].body.html;
      const re = /\<b\>([^)]+)\<\/b\>/;
      const OTP = EMAIL_CONTENT.match(re)[1];
      cy.get('input[type=tel]').type(OTP);
      cy.get('button[type=submit]').click();
    });

    //initiate campaign
    cy.contains(':button', 'Create').click();
    cy.get('input[id="nameCampaign"]').type(CAMPAIGN_NAME);
    cy.contains(':button', 'SMS').click();
    cy.contains(':button', 'Create').click();

    //step 1 : enter message template
    cy.get('#message').type(MSG_CONTENT);
    cy.contains(':button', 'Next').click();

    //step 2 : upload csv file
    cy.get('input[type="file"]').attachFile(CSV_FILENAME);
    cy.contains('Message preview');
    cy.contains(CSV_FILENAME);
    cy.contains(NUM_RECIPIENTS.concat(' recipients'));
    cy.contains(':button', 'Next').click();

    //step 3 : send test SMS
    cy.get('div[class*="Dropdown_select"]').click();
    cy.contains(TWILIO_CRED_SAVED).click();
    cy.get('input[type="tel"]').type(SMS_NUMBER);
    cy.get('button[type="submit"]').click();
    cy.contains('validated');
    cy.contains(':button', 'Next').click();

    //step 4 : send campaign
    cy.contains(':button', 'Send').click();
    cy.contains(':button', 'Confirm').click();

    // step 5 : dismiss feedback modal
    cy.get('button[title="Close modal"]').click();

    //check feedback for success
    cy.contains('Sending completed');
    cy.contains('Sent to recipient').siblings().contains(NUM_RECIPIENTS);
    cy.wait(WAIT_TIME);

    //verify that SMS is being received
    cy.request({
      method: 'GET',
      url: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACC_SID}/Messages.json?to=${SMS_NUMBER}`,
      auth: {
        username: TWILIO_ACC_SID,
        password: TWILIO_AUTH_TOKEN,
        AuthMethod: 'BasicAuth',
      },
    })
      .its('body')
      .then((res) => {
        let messageCount = 0;
        for (let i = 0; i < MSG_TO_SEARCH; i++) {
          if (
            res.messages[i].direction === 'inbound' &&
            res.messages[i].body === MSG_TO_VERIFY
          ) {
            messageCount += 1;
          }
        }
        assert.equal(
          messageCount,
          MSG_TO_EXPECT,
          'test and/or actual sms not received',
        );
      });

    //wait for report to be generated and download it
    cy.wait(REPORT_WAIT_TIME);
    cy.contains(':button', 'Report').click();

    //check report, status should be SUCCESS
    cy.wait(WAIT_TIME);
    const downloadPath = Cypress.config('downloadsFolder');
    cy.task('findDownloaded', downloadPath).then((file_names) => {
      file_names.forEach((name) => {
        if (name.startsWith(MODE)) {
          cy.readFile(downloadPath + '/' + name).should('contain', 'SUCCESS');
        }
      });
    });
  });
});
