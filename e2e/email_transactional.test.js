const puppeteer = require('puppeteer');

const { checkGmail } = require('./gmail_check');

describe('Email Transactional', () => {
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;
  const recipient = process.env.MAILBOX;

  let page, browser;
  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = (await browser.pages())[0];
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should send an email successfully', async () => {
    const currentTimestamp = new Date();
    const randomString = '_'.concat(
      Math.floor(Math.random() * 1000000 + 1).toString(),
    );

    const messageContent = `Hello postman ${randomString}`;
    const messageSubject = 'sub_'
      .concat(currentTimestamp.toISOString())
      .concat(randomString);

    await page.goto(`${apiUrl}/docs`);

    const authButtonSelector = '.btn.authorize.unlocked';
    await page.waitForSelector(authButtonSelector);
    await page.click(authButtonSelector);
    await page.type('input[aria-label="auth-bearer-value"]', apiKey);
    await page.click('.modal-btn.authorize[type="submit"]');
    await page.click('.modal-btn.btn-done');
    const sendEndpointID = 'operations-Email-post_transactional_email_send';
    await page.click(`#${sendEndpointID} button.opblock-summary-control`);

    const tryOutBtn = await page.waitForSelector(
      `#${sendEndpointID} .btn.try-out__btn`,
    );
    await tryOutBtn.click();
    const reqBodyInputSelector = `#${sendEndpointID} .body-param__text`;
    // Have to inject JS into the page and clear the value this way as the textarea
    // is prefilled with the default values from the OpenAPI specs
    await page.$eval(reqBodyInputSelector, (el) => {
      el.value = '';
      el.innerHTML = '';
    });
    await page.type(
      reqBodyInputSelector,
      `{
        "subject": "${messageSubject}",
        "body": "${messageContent}",
        "recipient": "${recipient}"
      }`,
    );
    await page.click(`#${sendEndpointID} .btn.execute`);
    const emails = await checkGmail({
      from: 'donotreply@mail.postman.gov.sg',
      subject: messageSubject,
      to: recipient,
    });
    const statusCode = await page.$eval(
      `#${sendEndpointID} .response .response-col_status`,
      (el) => el.innerText,
    );
    expect(statusCode).toBe('201');
    expect(emails).toBeTruthy();
    expect(emails.length).toBe(1);
    expect(emails[0].body.html.includes(messageContent)).toBe(true);
  });
});
