describe('Email Test', () => {
  it('initiate email campaign', async () => {
    // have these vars here so it won't affect retry results
    // (e.g. emails received from previous try being counted in the latest one
    // as they share the same subject line)
    const MODE = 'email';
    const CSV_FILENAME = 'testfile_email.csv';
    const NUM_RECIPIENTS = '1';
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
      Math.floor(Math.random() * 1000000 + 1).toString()
    );
    const SUBJECT_NAME = 'sub_'.concat(DATETIME).concat(RANDOM_STRING);
    const MSG_CONTENT = Cypress.env('MSG_CONTENT').concat(RANDOM_STRING);

    const OTP_SUBJECT = Cypress.env('OTP_SUBJECT');
    const EMAIL = Cypress.env('EMAIL');
    const MAIL_SENDER = Cypress.env('MAIL_SENDER');
    const WAIT_TIME = Cypress.env('WAIT_TIME');

    // write csv test file
    // check if not exist first
    cy.task('readFileMaybe', CSV_FILENAME).then((res) => {
      if (!res) {
        const CSV_CONTENT = 'recipient,name\n' + EMAIL + ',postman';
        cy.writeFile('cypress/fixtures/'.concat(CSV_FILENAME), CSV_CONTENT);
      }
    });

    // log in via OTP
    cy.visit('/login');
    cy.get('input[type=email]');
    cy.get('input[type=email]').type(EMAIL);
    cy.get('button[type=submit]').click();
    cy.wait(WAIT_TIME);

    cy.task('gmail:check', {
      from: MAIL_SENDER,
      to: EMAIL,
      subject: OTP_SUBJECT,
    }).then((email) => {
      assert.isNotNull(email, 'OTP email was not found');
      const LOGIN_EMAIL_CONTENT = email[0].body.html;
      const OTP_RE = /\<b\>([^]+)\<\/b\>/;
      const OTP = LOGIN_EMAIL_CONTENT.match(OTP_RE)[1];
      cy.get('input[type=tel]').type(OTP);
      cy.get('button[type=submit]').click();
    });

    // initiate campaign
    cy.contains(':button', 'Create').click();
    cy.get('input[id="nameCampaign"]').type(CAMPAIGN_NAME);
    cy.contains(':button', 'Email').click();
    cy.contains(':button', 'Create').click();

    // step 1 : enter subject and message template
    cy.get('textarea[id="subject"]').type(SUBJECT_NAME);
    cy.get('div[aria-label="rdw-editor"]').type(MSG_CONTENT);
    cy.contains(':button', 'Next').click();

    // step 2 : upload csv file
    cy.get('input[type="file"]').attachFile(CSV_FILENAME);
    cy.contains('Message preview');
    cy.contains(CSV_FILENAME);
    cy.contains(NUM_RECIPIENTS.concat(' recipients'));
    cy.contains(':button', 'Next').click();

    // step 3 : send test email
    cy.get('input[type="email"]').type(EMAIL);
    cy.get('button[type="submit"]').click();
    cy.contains('validated');
    cy.contains(':button', 'Next').click();

    // step 4 : schedule campaign
    cy.contains(':button', 'Schedule for later').click();
    // schedule for 1 hour from now just to test
    CUR_DATE.setHours(CUR_DATE.getHours() + 1);
    cy.get('input[type="date"]').type(
      CUR_DATE.getFullYear() +
        '/' +
        CUR_DATE.getMonth() +
        1 +
        '/' +
        CUR_DATE.getDate()
    );
    cy.get('input[type="time"]').type(
      CUR_DATE.getHours() + ':' + CUR_DATE.getMinutes()
    );
    cy.contains(':button', 'Schedule campaign').click();
    // check stats for success
    cy.contains('Your campaign has been scheduled!');
  });
});
