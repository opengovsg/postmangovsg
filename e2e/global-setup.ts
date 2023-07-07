import { expect } from '@playwright/test';
import { chromium } from 'playwright';
import { DASHBOARD_URL, MAILBOX, POSTMAN_FROM } from './config';
import { checkGmail } from './gmail-check';

export default async function globalSetup() {
  await exportOTPLoginState();
}

async function exportOTPLoginState() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    baseURL: DASHBOARD_URL,
  });
  page.goto('/login');
  await page.locator('input[type=email]').fill(MAILBOX);
  await page.locator('button[type=submit]').click();

  const emails = await checkGmail({
    from: POSTMAN_FROM,
    subject: 'One-Time Password (OTP) for Postman.gov.sg',
    to: MAILBOX,
  });
  const otpMailContent = emails[0].body?.html as string;
  const otp = (otpMailContent.match(/\<b\>([^]+)\<\/b\>/) as string[])[1];
  await page.locator('input[type=text]').fill(otp);
  await page.locator('button[type=submit]').click();
  await expect(page.getByText(/Welcome/)).toBeVisible();

  await page.context().storageState({ path: './cookie-auth-state.json' });
  await browser.close();
}
