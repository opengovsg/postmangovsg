describe('SMS Test', () => {

    const CSV_FILENAME = "testfile_sms.csv"
    const NUM_RECIPIENTS = '1'

    var CUR_DATE = new Date();
    var DATETIME = CUR_DATE.getDate() + "/"
                + (CUR_DATE.getMonth()+1)  + "/" 
                + CUR_DATE.getFullYear() + "@"  
                + CUR_DATE.getHours() + ":"  
                + CUR_DATE.getMinutes() + ":" 
                + CUR_DATE.getSeconds();
    const CAMPAIGN_NAME = "sms_".concat(DATETIME)
    const RANDOM_STRING = "_".concat((Math.floor((Math.random() * 1000000) + 1)).toString())
    const MSG_CONTENT = Cypress.env('MSG_CONTENT').concat(RANDOM_STRING)
    const MSG_TO_VERIFY = Cypress.env('MSG_TO_VERIFY').concat(RANDOM_STRING)

    const OTP_SUBJECT = Cypress.env('OTP_SUBJECT')
    const EMAIL = Cypress.env('EMAIL')
    const MAIL_SENDER = Cypress.env('MAIL_SENDER')
    const SMS_NUMBER = Cypress.env('SMS_NUMBER')
    const TWILIO_ACC_SID = Cypress.env('TWILIO_ACC_SID')
    const TWILIO_AUTH_TOKEN = Cypress.env('TWILIO_AUTH_TOKEN')

    it('initiate email campaign', () => {
        //log in via OTP
        cy.visit('/login')
        cy.get('input[type=email]').type(EMAIL)
        cy.get('button[type=submit]').click()
        cy.wait(10000)

        cy.task("gmail:check", {
            from: MAIL_SENDER,
            to: EMAIL,
            subject: OTP_SUBJECT
        }).then(email => {
            assert.isNotNull(email, 'Email was not found')
            const EMAIL_CONTENT = email[0].body.html
            const re = /\<b\>([^)]+)\<\/b\>/;
            const OTP = EMAIL_CONTENT.match(re)[1]
            cy.log(OTP)
            cy.get('input[type=tel]').type(OTP)
            cy.get('button[type=submit]').click()
        })

        //initiate campaign
        cy.contains(":button", "Create").click()
        cy.get('input[type="text"]').type(CAMPAIGN_NAME)
        cy.contains(":button", "SMS").click()
        cy.contains(":button", "Create").click()

        //step 1 : enter message template
        cy.get('textarea[id="message"]').type(MSG_CONTENT)
        cy.contains(":button", "Next").click()

        //step 2 : upload csv file
        cy.get('input[type="file"]').attachFile(CSV_FILENAME)
        cy.contains('Message preview', {timeout: 50000})
        cy.contains(CSV_FILENAME)
        cy.contains(NUM_RECIPIENTS.concat(" recipients"))
        cy.contains(":button", "Next").click()

        //step 3 : send test SMS
        cy.get('div[class*="Dropdown_select"]').click()
        cy.contains('default').click()
        cy.get('input[type="tel"]').type(SMS_NUMBER)
        cy.get('button[type="submit"]').click()
        cy.contains('validated', {timeout: 10000})
        cy.contains(":button", "Next").click()

        //step 4 : send campaign
        cy.contains(":button", "Send").click()
        cy.contains(":button", "Confirm").click()

        //check feedback for success
        cy.contains('Sending completed', {timeout: 100000})
        cy.contains('Sent to recipient').siblings().contains(NUM_RECIPIENTS)
        cy.wait(10000)

        //verify that SMS is being received
        cy.request({
            method: 'GET',
            url: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACC_SID}/Messages.json`,
            auth: {
                username: TWILIO_ACC_SID,
                password: TWILIO_AUTH_TOKEN,
                AuthMethod: 'BasicAuth',
            }
        })
            .its('body').then((res) => {
            var msg_cnt = 0
            for (let i = 0; i < 15; i ++){
                if (res.messages[i].direction === 'inbound' && res.messages[i].body === MSG_TO_VERIFY){
                    msg_cnt += 1
                }
            }
            assert.equal(msg_cnt, 2, "test and/or actual email not received")
        })
    })

})