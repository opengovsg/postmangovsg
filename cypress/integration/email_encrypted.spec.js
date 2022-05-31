describe('Encrypted Email Test', () => {

    const CSV_FILENAME = "testfile_encrypted.csv"
    const NUM_RECIPIENTS = '1'

    var CUR_DATE = new Date();
    var DATETIME = CUR_DATE.getDate() + "/"
                + (CUR_DATE.getMonth()+1)  + "/" 
                + CUR_DATE.getFullYear() + "@"  
                + CUR_DATE.getHours() + ":"  
                + CUR_DATE.getMinutes() + ":" 
                + CUR_DATE.getSeconds();
    const CAMPAIGN_NAME = "encrypted_".concat(DATETIME)
    const RANDOM_STRING = "_".concat((Math.floor((Math.random() * 1000000) + 1)).toString())
    const SUBJECT_NAME = "sub_enc_".concat(DATETIME).concat(RANDOM_STRING)
    const MSG_CONTENT = Cypress.env('MSG_CONTENT').concat(RANDOM_STRING)
    const MSG_TO_VERIFY = Cypress.env('MSG_TO_VERIFY').concat(RANDOM_STRING)

    const OTP_SUBJECT = Cypress.env('OTP_SUBJECT')
    const EMAIL = Cypress.env('EMAIL')
    const MAIL_SENDER = Cypress.env('MAIL_SENDER')
    const REDIRECTION_MSG = Cypress.env('REDIRECTION_MSG')
    const PASSWORD_ENC_VERIFICATION = Cypress.env('PASSWORD_ENC_VERIFICATION')

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
            assert.isNotNull(email, 'OTP email was not found')
            const LOGIN_EMAIL_CONTENT = email[0].body.html
            const OTP_RE = /\<b\>([^)]+)\<\/b\>/;
            const OTP = LOGIN_EMAIL_CONTENT.match(OTP_RE)[1]
            cy.log(OTP)
            cy.get('input[type=tel]').type(OTP)
            cy.get('button[type=submit]').click()
        })

        //initiate campaign
        cy.contains(":button", "Create").click()
        cy.get('input[type="text"]').type(CAMPAIGN_NAME)
        cy.contains(":button", "Email").click()
        cy.get('i[class*="checkbox"]').click()
        cy.contains(":button", "Create").click()

        //step 1 : enter subject and redirection message template
        cy.get('textarea[id="subject"]').type(SUBJECT_NAME)
        cy.contains('Dear').type(REDIRECTION_MSG)
        cy.contains(":button", "Next").click()


        //step 2 : enter message template for encryption and upload csv file
        cy.get('textarea[id="protectedMessage"]').type(MSG_CONTENT)
        cy.get('input[type="file"]').attachFile(CSV_FILENAME)
        cy.contains('Results', {timeout: 50000})
        cy.contains(CSV_FILENAME)
        cy.contains(NUM_RECIPIENTS.concat(" recipients"))
        cy.contains(":button", "Confirm").click()
        cy.contains('Message preview', {timeout: 50000})
        cy.contains(":button", "Next").click()

        //step 3 : send test email
        cy.get('input[type="email"]').type(EMAIL)
        cy.get('button[type="submit"]').click()
        cy.contains('validated', {timeout: 10000})
        cy.contains(":button", "Next").click()

        //step 4 : send campaign
        cy.contains(":button", "Send").click()
        cy.contains(":button", "Confirm").click()

        //check stats for success
        cy.contains('Sending completed', {timeout: 100000})
        cy.contains('Sent to recipient').siblings().contains(NUM_RECIPIENTS)
        cy.wait(10000)

        //Verify that email is being received
        cy.task("gmail:check", {
            from: MAIL_SENDER,
            to: EMAIL,
            subject: SUBJECT_NAME
        }).then(email => {
            cy.log(email.length)
            cy.log(email)
            assert(email.length == 2, 'test and/or actual email was not found')

            const LINK_RE = /postman\.gov\.sg\/([^\<]+)/;
            for (let i = 0; i < 2; i ++){
                var sent_email_content = email[i].body.html
                var link = sent_email_content.match(LINK_RE)[1]
                cy.log(link)
                cy.visit("/".concat(link))
                cy.get('input[type="password"]').type(PASSWORD_ENC_VERIFICATION)
                cy.get('button[type="submit"]').click()
                cy.contains(MSG_TO_VERIFY)
            }
        })
    })

})