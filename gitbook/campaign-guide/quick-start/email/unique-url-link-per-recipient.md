---
description: >-
  There are 2 ways to insert unique clickable URL links into your message
  template, customised by recipient.
---

# Unique URL Link per Recipient

## Method 1: Unique link couched in a word

1. Highlight the word/phrase that you want hyperlinked, and click the "Insert link" icon.
2. In the "Link to" field, type in `{{url}}`.

<figure><img src="../../../.gitbook/assets/Screenshot 2022-11-08 at 5.03.37 PM.png" alt=""><figcaption></figcaption></figure>

3\. In your CSV Recipient list, include a column with the header `url`. Fields under this column must begin with `https://`

<figure><img src="../../../.gitbook/assets/Screenshot 2022-11-08 at 5.07.09 PM.png" alt=""><figcaption></figcaption></figure>

##

## Method 2: Unique link is displayed in full (also possible for SMS)

1. In the message template, write your variable field as `{{xxx_link}}`. You can fill in the first word with any word you want, as long as it is followed by `_link`. For example:

<figure><img src="../../../.gitbook/assets/Screenshot 2022-11-08 at 6.06.33 PM.png" alt=""><figcaption></figcaption></figure>

2\. In your CSV file, the header must also follow this naming convention i.e. `xxx_link`

<figure><img src="../../../.gitbook/assets/Screenshot 2022-11-08 at 6.10.31 PM.png" alt=""><figcaption></figcaption></figure>

By following these steps, the full link will appear in the message that your recipient receives.
