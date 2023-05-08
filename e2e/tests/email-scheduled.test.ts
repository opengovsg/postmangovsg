import test, {expect} from '@playwright/test';
import {Page} from 'playwright';
import path from 'path';
import {writeFileSync} from 'fs';

import {DASHBOARD_URL, MAILBOX} from '../config';
import moment from 'moment';

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({
    baseURL: DASHBOARD_URL,
    storageState: path.resolve(__dirname, '../cookie-auth-state.json'),
  });
});

test.describe.serial('Scheduled email campaign', () => {
  const dateTime = moment().format('DD/MM/YYYY@HH:mm:ss');
  const campaignName = `emailscheduled_${dateTime}`;

  const randomString = '_'.concat(
    Math.floor(Math.random() * 1000000 + 1).toString(),
  );
  const subjectLine = 'subscheduled_'.concat(dateTime).concat(randomString);
  const messageContent = `Dear {{ name }} ${randomString}`;

  test('should be successfully created', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('input[id="nameCampaign"]').fill(campaignName);
    await page.getByRole('radio', { name: /^email$/i }).click();
    await page.getByRole('button', { name: 'Create campaign' }).click();
    await expect(page.getByText(/Step 1/)).toBeVisible();
  });

  test('should be successfully filled with message details', async () => {
    await page.locator('textarea[id="subject"]').fill(subjectLine);
    await page.locator('div[aria-label="rdw-editor"]').fill(messageContent);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Step 2/)).toBeVisible();
  });

  test('should have messages generated from uploaded recipient list', async () => {
    writeFileSync(
      './email-recipients.csv',
      `recipient,name\n${MAILBOX},postman`,
    );
    await page
      .locator('input[type="file"]')
      .setInputFiles('./email-recipients.csv');
    await expect(page.getByText('Message preview')).toBeVisible();
    await expect(page.getByText('email-recipients.csv')).toBeVisible();
    await expect(page.getByText('1 recipients')).toBeVisible();
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

  test('should be able to be scheduled', async () => {
    const scheduledDate = moment().add(1, 'hour');
    await page.getByRole('button', { name: 'Schedule for later' }).click();
    await page
      .locator('input[type="date"]')
      .fill(scheduledDate.format('yyyy-MM-DD'));
    await page
      .locator('input[type="time"]')
      .fill(scheduledDate.format('HH:mm'));
    await page.getByRole('button', { name: 'Schedule campaign' }).click();
    await expect(page.getByRole('row', { name: /1 Scheduled/ })).toBeVisible();
  });
});
