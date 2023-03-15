import test, { expect } from '@playwright/test';
import { Page } from 'playwright';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

import { DASHBOARD_URL, MAILBOX, POSTMAN_FROM } from '../config';
import { checkGmail } from '../gmail-check';

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({
    baseURL: DASHBOARD_URL,
    storageState: path.resolve(__dirname, '../cookie-auth-state.json'),
  });
});

test.describe.serial('Protected email campaign', () => {
  const currDate = new Date();
  const dateTime =
    currDate.getDate() +
    '/' +
    (currDate.getMonth() + 1) +
    '/' +
    currDate.getFullYear() +
    '@' +
    currDate.getHours() +
    ':' +
    currDate.getMinutes() +
    ':' +
    currDate.getSeconds();
  const campaignName = `emailprotected_${dateTime}`;

  const randomString = '_'.concat(
    Math.floor(Math.random() * 1000000 + 1).toString(),
  );
  const subjectLine = 'subprotected_'.concat(dateTime).concat(randomString);
  const messageContent = `Dear {{ name }} ${randomString}`;
  const messageToVerify = `Dear postman ${randomString}`;

  test('should be successfully created', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('input[id="nameCampaign"]').fill(campaignName);
    await page.getByRole('button', { name: /email/i }).click();
    await page.locator('i[class*="checkbox"]').click();
    await page.getByRole('button', { name: 'Create campaign' }).click();
    await expect(page.getByText(/Step 1/)).toBeVisible();
  });

  test('should be successfully filled with redirection message details', async () => {
    await page.locator('textarea[id="subject"]').fill(subjectLine);
    await page
      .locator('div[aria-label="rdw-editor"]')
      .fill('Dear {{ recipient }}, please access via {{ protectedlink }}');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Step 2/)).toBeVisible();
  });

  test('should be successfully filled with protected message', async () => {
    writeFileSync(
      './email-recipients.csv',
      `recipient,password,name\n${MAILBOX},hello,postman`,
    );
    await page.locator('div[aria-label="rdw-editor"]').fill(messageContent);
    await page
      .locator('input[type="file"]')
      .setInputFiles('./email-recipients.csv');
    await expect(page.getByText('Message B')).toBeVisible();
    await expect(page.getByText('email-recipients.csv')).toBeVisible();
    await expect(page.getByText('1 recipients')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Message preview')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Step 3/)).toBeVisible();
  });

  test('should be able to validate email credentials', async () => {
    await page.locator('input[type="email"]').fill(MAILBOX);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/validated/)).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Step 4/)).toBeVisible();
  });

  test('should be able to send out', async ({ browser }) => {
    await page.getByRole('button', { name: /Send/ }).click();
    await page.getByRole('button', { name: /Confirm/ }).click();

    const emails = await checkGmail({
      from: POSTMAN_FROM,
      to: MAILBOX,
      subject: subjectLine,
    });

    await page.locator('button[title="Close modal"]').click();
    await expect(page.getByText(/Sending completed/)).toBeVisible();
    // wait for the email to be successfully sent
    await expect(
      page.getByRole('row', { name: /Sent Sent to recipient 1/ }),
    ).toBeVisible();

    expect(emails).toBeTruthy();
    // 1 is the actual email, the other is the "successfully sent out" notification
    expect(emails.length === 1 || emails.length === 2).toBe(true);
    const emailIndex = emails.length === 1 ? 0 : 1;
    const emailContent = emails[emailIndex].body?.html;
    const link = (
      emailContent?.match(/postman\.gov\.sg\/([^\<]+)/) as string[]
    )[1];

    const pwProtectedPage = await browser.newPage({ baseURL: DASHBOARD_URL });
    pwProtectedPage.goto(link);
    await pwProtectedPage.locator('input[type="password"]').fill('hello');
    await pwProtectedPage.locator('button[type="submit"]').click();
    await expect(pwProtectedPage.getByText(messageToVerify)).toBeVisible();
    await pwProtectedPage.close();
  });

  test('should be able to have a report generated', async () => {
    await expect(
      page.getByRole('button', { name: 'Report' }).locator('i'),
    ).toHaveClass(/bx-download/, { timeout: 60000 });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Report' }).click();
    const download = await downloadPromise;
    const content = readFileSync((await download.path()) as string);
    expect(content.toString()).toContain(MAILBOX);
  });
});
