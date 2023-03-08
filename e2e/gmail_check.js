const gmail = require('gmail-tester');
const path = require('path');

module.exports = {
  checkGmail: async ({ from, to, subject }) => {
    // slient unnecessary logging from the library
    const oldLog = console.log;
    console.log = function () {};
    const emails = await gmail.check_inbox(
      path.resolve(__dirname, 'credentials.json'),
      path.resolve(__dirname, 'gmail_token.json'),
      {
        subject,
        from,
        to,
        wait_time_sec: 10,
        max_wait_time_sec: 60,
        include_body: true,
      },
    );
    console.log = oldLog;
    return emails;
  },
};
