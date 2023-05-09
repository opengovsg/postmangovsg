import { check_inbox, Email } from 'gmail-tester';
import path from 'path';

export const checkGmail = async ({
  from,
  to,
  subject,
}: {
  from: string;
  to: string;
  subject: string;
}): Promise<Email[]> => {
  // slient unnecessary logging from the library
  const oldLog = console.log;
  console.log = function () {};
  const emails = await check_inbox(
    path.resolve(__dirname, 'credentials.json'),
    path.resolve(__dirname, 'gmail_token.json'),
    {
      subject,
      from,
      to,
      wait_time_sec: 10,
      max_wait_time_sec: 60,
      include_body: true,
      after: new Date(),
    }
  );
  console.log = oldLog;
  return emails;
};
