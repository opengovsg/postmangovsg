# Forking and configuring this product

- [Forking and configuring this product](#forking-and-configuring-this-product)
  - [Frontend](#frontend)
    - [Minimal set of environment variables](#minimal-set-of-environment-variables)
    - [Images and brands](#images-and-brands)

## Frontend

To configure the front end, environment variables have to be injected at build time.

Further reference: [Create-react-app documentation](https://create-react-app.dev/docs/adding-custom-environment-variables/#referencing-environment-variables-in-the-html)

### Minimal set of environment variables

| Name                    | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `REACT_APP_BACKEND_URL` | URL of the API server. Example: `http://localhost:8080/v1`                                                        |
| `REACT_APP_TITLE`       | Title of the app. Example: `Postman.gov.sg`                                                                       |
| `REACT_APP_DESCRIPTION` | Meta description. Example: `Postman.gov.sg enables public officers to send templated messages to many recipients` |

### Images and brands

The images under `frontend/src/assets/img/brand` can be replaced.

| Name                   | Description                       |
| ---------------------- | --------------------------------- |
| `app-logo.svg`         | The dark version of the app logo  |
| `app-logo-reverse.svg` | The light version of the app logo |
| `company-logo.svg`     | The logo of the company           |
