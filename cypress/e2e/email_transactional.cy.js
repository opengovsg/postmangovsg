const path = require('path');

describe('Transactional Email Test', () => {
  it('should be able to send emails through API successfully', async () => {
    const currentTimestamp = new Date();
    const randomString = '_'.concat(
      Math.floor(Math.random() * 1000000 + 1).toString(),
    );
    const mailSender = Cypress.env('MAIL_SENDER');
    const recipient = Cypress.env('EMAIL');

    const messageContent = `Hello postman ${randomString}`;
    const messageSubject = 'sub_'
      .concat(currentTimestamp.toISOString())
      .concat(randomString);
    const apiUrl = Cypress.env('API_BASE_URL');
    const apiKey = Cypress.env('API_KEY');

    let messageId;

    // /transaction/email/send
    {
      const requestUrl = new URL(apiUrl);
      requestUrl.pathname = '/v1/transactional/email/send';

      // Note: Can't use txt/plain or txt/html with gmail-tester until this is fixed
      // https://github.com/levz0r/gmail-tester/pull/110
      // const attachmentFilename = 'example_attachment.txt';
      // cy.writeFile(
      //   `cypress/fixtures/${attachmentFilename}`,
      //   'example content',
      // );
      const attachmentFilename = 'example.pdf';
      const exampleAttachment = await cy.fixture(attachmentFilename, 'binary');
      const blob = Cypress.Blob.binaryStringToBlob(
        exampleAttachment,
        'text/pdf',
      );
      const formData = new FormData();
      formData.append('attachments', blob, attachmentFilename);
      formData.append('subject', messageSubject);
      formData.append('body', messageContent);
      formData.append('recipient', recipient);

      // This request is being sent from the browser instance, it's working because
      // we have CORs settings to allow our frontend URLs to send requests to APIs
      // Note: Somehow cy.task is not a true Promise so need to wrap it around with
      // a Promise constructor for it to work
      const response = await new Promise((r) =>
        cy
          .request({
            method: 'POST',
            url: requestUrl.toString(),
            body: formData,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'multipart/form-data',
            },
          })
          .then(r),
      );
      assert.equal(
        response.status,
        201,
        `Expected: 201, Got: ${response.status}`,
      );

      // Somehow if we send requests with formData body the response body won't
      // be automatically parsed as a JSON object
      const { id } = JSON.parse(
        String.fromCharCode.apply(null, new Uint8Array(response.body)),
      );
      messageId = id;

      // Note: Somehow cy.task is not a true Promise so need to wrap it around with
      // a Promise constructor for it to work
      const email = await new Promise((r) =>
        cy
          .task('gmail:check', {
            from: mailSender,
            to: recipient,
            subject: messageSubject,
          })
          .then(r),
      );
      assert.equal(
        email.length,
        1,
        `Expected 1 matching email in the inbox, got ${email.length}`,
      );
    }

    // /transaction/email/{emailId}
    {
      const requestUrl = new URL(apiUrl);
      requestUrl.pathname = path.join('/v1/transactional/email', messageId);

      // This request is being sent from the browser instance, it's working because
      // we have CORs settings to allow our frontend URLs to send requests to APIs
      // Note: Somehow cy.task is not a true Promise so need to wrap it around with
      // a Promise constructor for it to work
      const response = await new Promise((r) =>
        cy
          .request({
            method: 'GET',
            url: requestUrl.toString(),
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          })
          .then(r),
      );
      assert.equal(
        response.status,
        200,
        `Expected: 200, Got: ${response.status}`,
      );
      const { body } = response;
      assert.equal(
        body.id,
        messageId,
        `Expected message ID ${messageId}, got ${body.id}`,
      );
      assert.isNotNull(body.attachments_metadata);
      assert.equal(
        body.attachments_metadata.length,
        1,
        `Expected 1 attachment metadata, got ${body.attachments_metadata.length}`,
      );
    }
  });
});
