import test, { expect, Page } from "@playwright/test";
import moment from "moment";
import { API_KEY, API_URL, MAILBOX } from "../config";

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ baseURL: API_URL });
});
test.afterAll(async () => {
  await page.close();
});

test.describe.serial("Email transactional messages", () => {
  test("should be successfully sent out", async () => {
    const dateTime = moment().format("DD/MM/YYYY@HH:mm:ss");
    const randomString = "_".concat(
      Math.floor(Math.random() * 1000000 + 1).toString()
    );

    const messageContent = `Hello postman ${randomString}`;
    const messageSubject = "subtransactional_"
      .concat(dateTime)
      .concat(randomString);

    await page.goto("/docs");

    await page.locator(".btn.authorize.unlocked").click();
    await page.locator('input[aria-label="auth-bearer-value"]').fill(API_KEY);
    await page.locator('.modal-btn.authorize[type="submit"]').click();
    await page.locator(".modal-btn.btn-done").click();
    const sendEndpointID = "operations-Email-post_transactional_email_send";
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
      .locator(
        `#${sendEndpointID} .live-responses-table .response .response-col_status`
      )
      .nth(0)
      .innerText();
    expect(statusCode).toBe("201");
  });
});
