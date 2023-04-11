# Variable Fields

You may wish to personalise your emails with variable fields whose content will change depending on recipient information. Postman allows you to do this by the following steps:

1. Use double curly brackets **\{{    \}}** in the message template to indicate a variable field (see the screenshot below for an example). The field will be populated with the recipient's unique test result as reflected in your CSV file (see step 2).

&#x20;![](https://lh5.googleusercontent.com/Z--1ojvTKY98Cko2gmyaVtgKjiSiLoJz-9tng6PnYkr7YXO-kwS2ZQ-59hCQaY5jfILe\_91Z96lOh6m9g3xevYgePbxVFMXrqAJaIblXHDFrHalM8FQeg0KlvuqsjWV0BFzVNadb7lXoP29Cdcly5Yy9zA)

2\. In the same CSV file that you upload with recipient information (in step 3 of the campaign creation flow), include the corresponding variable field names and the accompanying information for each unique recipient.

* text in the variable content fields should _not_ have spacings - instead, replace spacings with underscores e.g. instead of "test result", the variable field in the message template _and_ your CSV file should reflect "test\_result".
* by convention, all text content in variable fields must be in _small letters._

![](<../../../.gitbook/assets/Screenshot 2022-08-22 at 2.46.21 PM.png>)
