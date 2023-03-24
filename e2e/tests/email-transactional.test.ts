import test, { expect, Page } from '@playwright/test';
import { API_KEY, API_URL, MAILBOX, POSTMAN_FROM } from '../config';
import { checkGmail } from '../gmail-check';

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ baseURL: API_URL });
});
test.afterAll(async () => {
  await page.close();
});

test.describe.serial('Email transactional messages', () => {
  test('should be successfully sent out', async () => {
    const currentTimestamp = new Date();
    const randomString = '_'.concat(
      Math.floor(Math.random() * 1000000 + 1).toString(),
    );

    const messageContent = `Hello postman ${randomString}`;
    const messageSubject = 'sub_'
      .concat(currentTimestamp.toISOString())
      .concat(randomString);

    await page.goto('/docs');

    await page.locator('.btn.authorize.unlocked').click();
    await page.locator('input[aria-label="auth-bearer-value"]').fill(API_KEY);
    await page.locator('.modal-btn.authorize[type="submit"]').click();
    await page.locator('.modal-btn.btn-done').click();
    const sendEndpointID = 'operations-Email-post_transactional_email_send';
    await page
      .locator(`#${sendEndpointID} button.opblock-summary-control`)
      .click();

    await page.locator(`#${sendEndpointID} .btn.try-out__btn`).click();
    await page.locator(`#${sendEndpointID} .body-param__text`).fill(`{
	"subject": "${messageSubject}",
	"body": "${messageContent}",
	"recipient": "${MAILBOX}"
     }`);
    await page.locator(`#${sendEndpointID} .btn.execute`).click();
    const statusCode = await page
      .locator(`#${sendEndpointID} .response .response-col_status`)
      .nth(0)
      .innerText();
    expect(statusCode).toBe('201');

    const emails = await checkGmail({
      from: POSTMAN_FROM,
      subject: messageSubject,
      to: MAILBOX,
    });
    expect(emails).toBeTruthy();
    expect(emails.length).toBe(1);
    expect(emails[0].body?.html.includes(messageContent)).toBe(true);
  });
});
