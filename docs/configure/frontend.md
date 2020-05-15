# Forking and configuring this product

  * [Frontend](#frontend)
    + [Minimal set of environment variables](#minimal-set-of-environment-variables)
    + [Images and brands](#images-and-brands)

## Frontend
To configure the front end, environment variables have to be injected at build time. Further reference: https://create-react-app.dev/docs/adding-custom-environment-variables/#referencing-environment-variables-in-the-html

### Minimal set of environment variables
|Name|Description|Example|
|--|--|--|
|REACT_APP_BACKEND_URL|URL of the API server|http://localhost:4000/v1|
|REACT_APP_TITLE|Title of the app|Postman.gov.sg|
|REACT_APP_DESCRIPTION|Meta description|Postman.gov.sg enables public officers to send templated messages to many recipients|
|REACT_APP_GUIDE_URL|URL to an FAQ site|https://guide.postman.gov.sg|
|REACT_APP_GUIDE_CREDENTIALS_URL|URL to explain how someone may onboard themselves onto Twilio |https://guide.postman.gov.sg/twilio-sms.html#where-can-i-find-credentials-on-the-twilio-console|
|REACT_APP_GUIDE_POWER_USER_URL|URL to explain what Twilio send rate is|https://guide.postman.gov.sg/poweruser.html|
|REACT_APP_CONTACT_US_URL|URL to a contact form|https://form.gov.sg/#!/5e8db1736d789b0011743202|
|REACT_APP_LOGIN_EMAIL_TEXT|Call to action text on landing page |Sign in with your .gov.sg email|
|REACT_APP_LOGIN_EMAIL_PLACEHOLDER|Placeholder for login input box|e.g. postman@agency.gov.sg|

### Images and brands
The images under `frontend/src/assets/img/brand` can be replaced.
|Name|Description|
|--|--|
|app-logo.svg|The dark version of the app logo|
|app-logo-reverse.svg|The light version of the app logo
|company-logo.svg|The logo of the company|