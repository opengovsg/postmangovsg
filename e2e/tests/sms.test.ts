import test, { expect, request } from "@playwright/test";
import { Page } from "playwright";
import path from "path";
import { readFileSync, writeFileSync } from "fs";

import {
  DASHBOARD_URL,
  SMS_NUMBER,
  TWILIO_ACC_SID,
  TWILIO_AUTH_TOKEN,
} from "../config";
import moment from "moment";

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({
    baseURL: DASHBOARD_URL,
    storageState: path.resolve(__dirname, "../cookie-auth-state.json"),
  });
});

test.describe.serial("SMS campaign", () => {
  const dateTime = moment().format("DD/MM/YYYY@HH:mm:ss");
  const campaignName = `sms_${dateTime}`;

  const randomString = "_".concat(
    Math.floor(Math.random() * 1000000 + 1).toString()
  );
  const messageContent = `Dear {{ name }} ${randomString}`;
  const messageToVerify = `Dear postman ${randomString}`;

  test("should be successfully created", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.locator('input[id="nameCampaign"]').fill(campaignName);
    await page.getByRole("radio", { name: /sms/i }).click();
    await page.getByRole("button", { name: "Create campaign" }).click();
    await expect(page.getByText(/Step 1/)).toBeVisible();
  });

  test("should be successfully filled with message details", async () => {
    await page.locator("#message").fill(messageContent);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 2/)).toBeVisible();
  });

  test("should have messages generated from uploaded recipient list", async () => {
    writeFileSync(
      "./sms-recipients.csv",
      `recipient,name\n${SMS_NUMBER},postman`
    );
    await page
      .locator('input[type="file"]')
      .setInputFiles("./sms-recipients.csv");
    await expect(page.getByText("Message preview")).toBeVisible();
    await expect(page.getByText("sms-recipients.csv")).toBeVisible();
    await expect(page.getByText("1 recipients")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 3/)).toBeVisible();
  });

  test("should be able to validate sms credentials", async () => {
    await page.locator('div[class*="Dropdown_select"]').click();
    await page.getByRole("option", { name: "default-postman" }).click();
    await page.locator('input[type="tel"]').fill(SMS_NUMBER);
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByRole("heading", { name: /validated/ })
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Step 4/)).toBeVisible();
  });

  test("should be able to send out", async () => {
    await page.getByRole("button", { name: /Send campaign now/ }).click();
    await page.getByRole("button", { name: /Confirm/ }).click();
    await page.locator('button[title="Close modal"]').click();
    await expect(page.getByText(/Sending completed/)).toBeVisible();

    const ctx = await request.newContext({
      baseURL: "https://api.twilio.com",
      httpCredentials: {
        username: TWILIO_ACC_SID,
        password: TWILIO_AUTH_TOKEN,
      },
    });
    const res = await ctx.get(
      `/2010-04-01/Accounts/${TWILIO_ACC_SID}/Messages.json?to=${SMS_NUMBER}`
    );
    expect(res.status()).toBe(200);
    interface TwilioMessage {
      direction: string;
      body: string;
    }
    const { messages } = (await res.json()) as { messages: TwilioMessage[] };
    const numMessagesToCheck = 10;
    const matchingMessages = messages
      .slice(0, numMessagesToCheck)
      .filter((m) => m.direction === "inbound" && m.body === messageToVerify);
    expect(matchingMessages.length).toBe(2);
  });

  test("should be able to have a report generated", async () => {
    await expect(
      page.getByRole("button", { name: "Report" }).locator("i")
    ).toHaveClass(/bx-download/, { timeout: 60000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Report" }).click();
    const download = await downloadPromise;
    const content = readFileSync((await download.path()) as string);
    expect(content.toString()).toContain(SMS_NUMBER);
  });
});
