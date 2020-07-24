# Forking and configuring this product

- [Frontend](#frontend)
  - [Minimal set of environment variables](#minimal-set-of-environment-variables)
  - [Images and brands](#images-and-brands)

## Frontend

To configure the front end, environment variables have to be injected at build time.

Further reference: [Create-react-app documentation](https://create-react-app.dev/docs/adding-custom-environment-variables/#referencing-environment-variables-in-the-html)

### Minimal set of environment variables

| Name                                | Description                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `REACT_APP_BACKEND_URL`             | URL of the API server. Example: `http://localhost:4000/v1`                                                        |
| `REACT_APP_TITLE`                   | Title of the app. Example: `Postman.gov.sg`                                                                       |
| `REACT_APP_DESCRIPTION`             | Meta description. Example: `Postman.gov.sg enables public officers to send templated messages to many recipients` |  |
| `REACT_APP_CONTACT_US_URL`          | URL to a contact form. Example: `https://form.gov.sg/#!/5e8db1736d789b0011743202`                                 |
| `REACT_APP_LOGIN_EMAIL_TEXT`        | Call to action text on landing page. Example: `Sign in with your .gov.sg email`                                   |
| `REACT_APP_LOGIN_EMAIL_PLACEHOLDER` | Placeholder for login input box. Example: `e.g. postman@agency.gov.sg`                                            |
| `REACT_APP_CONTRIBUTE_URL`          | URL to a repository. Example: `https://github.com/opengovsg/postman`                                              |
| `REACT_APP_REQUEST_URL`             | URL to a request form. Example: `https://form.gov.sg/#!/5ec2064a85d58100112184a4`                                 |
| `REACT_APP_PRIVACY_URL`             | URL to privacy policy. Example: `https://guide.postman.gov.sg/privacy.html`                                       |
| `REACT_APP_TC_URL`                  | URL to terms of use. Example: `https://guide.postman.gov.sg/t-c.html`                                             |
| `REACT_APP_REPORT_BUG_URL`          | URL to a form for reporting bugs. Example: `https://form.gov.sg/#!/5e8db1736d789b0011743202`                      |

### Images and brands

The images under `frontend/src/assets/img/brand` can be replaced.

| Name                   | Description                       |
| ---------------------- | --------------------------------- |
| `app-logo.svg`         | The dark version of the app logo  |
| `app-logo-reverse.svg` | The light version of the app logo |
| `company-logo.svg`     | The logo of the company           |
