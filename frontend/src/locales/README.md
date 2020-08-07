## Catalog format

PO file is the catalog format used in this project, as recommended by the author of linguiJS.

Refer to [this link](https://lingui.js.org/ref/catalog-formats.html) for more information.

If you prefer another catalog format, it can be configurable in `.linguirc`.

## Translation workflow

Refer to [this tutorial](https://lingui.js.org/tutorials/react.html#summary-of-basic-workflow) to understand the basic translation workflow.

A few things to take note:

1. Run `npm run extract` to generate message catalogs. Output will be in `src/locales/{locale}/messages.po`
2. Translate message catalogs (send them to translators usually)
3. Run `npm run compile` to create runtime catalogs, usually done before building the app for production.
