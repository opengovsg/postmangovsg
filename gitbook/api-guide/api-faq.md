---
description: >-
  This page is still under construction, if you do not find the answer to your
  question, please reach out to us directly
---

# API FAQ

## How to set up custom domain?

The following steps described the process of setting up custom domain on Postman.

1. **Postman will generate and send agency DKIM records**\

2.  **Agency to add DKIM records in your DNS**.

    Create 2 CNAME records in DNS (ITSM/DNS Provider) and add the DKIM files.

    \
    If you do not have access to your DNS records, you should speak to your ITD who has access to your agency domain (this is the domain that you want to send the email from, e.g [ica.gov.sg](http://ica.gov.sg)) on ITSM.\

3.  **Postman to add the specified sender email into our database.**

    Postman will inform agency once this step is done\

4.  **Agency to verify if the configuration works.**

    Postman uses Amazon SES, which may take up to 72 hours to complete the verification process in Step 2.

    \
    To check if you the domain configuration is done, you can either try sending an email using API or log into [Postman.gov.sg](http://postman.gov.sg/) portal and see if you are able to select your custom domain e.g ([do\_not\_reply@ica.gov.sg](mailto:do\_not\_reply@ica.gov.sg)) to send your campaign.\

5.  **If you require your emails to be receivable to .gov.sg emails** \
    Most agency domains would have been whitelisted on Postman but if you would like confirmation, you may reach the team separately on this.\
    \
    \


