---
description: >-
  Copy & paste these templates to experience the set-up for a password-protected
  campaign
---

# Tutorial

## Message A

```
Greetings,

This is the general message that the recipient will receive in his or her email inbox. 

-----

Please click on the following link <a href="{{protectedlink}}">{{protectedlink}}</a> 
to open your private content. 

<i>To open the password-protected email page, please enter the 
last 4 characters of your NRIC, including the letter in uppercase, 
followed by your date of birth in DDMMYYYY format. For example, 
if your NRIC is "T1234567A" and your birthdate is "13 January 2020", 
the 12-character password will be "567A13012020". </i>

<b>Why are you receiving an email from Postman.gov.sg?</b>
Postman.gov.sg is a mass email and SMS service for the Singapore government. 
We send password-protected emails on behalf of government agencies. 

-----
This is a system-generated email. Please do not reply.
```

## Message B

```
<img src="https://file.go.gov.sg/postman-telegram-header.png" width="500" />

Customise the header image with your agency logo ⤴. 

This is a secret or private message that will be password-protected.
You can customise this page by following the power users email formatting <a href="https://guide.postman.gov.sg/guide/power-users#email-formatting"> guide</a>. 

---

Dear {{name}},

Your secret pin is {{pin}}.

Please keep your pin safe and not share it with others. 

Sincerely,

Agency X

(This is a computer-generated letter which requires no signature)<p>
<img src="https://file.go.gov.sg/postman-footer.png" width="500" />
```

## CSV File

You can use the sample CSV file that we have created and change the recipient's email address to your email address.&#x20;

{% file src="../../../.gitbook/assets/ppe-postman-tutorial-sample-csv.csv" %}
Download sample csv here
{% endfile %}

## Sample Password-protected Page

Check out a sample page [here](https://postman.gov.sg/p/1/ab11edcd-d3c0-49c7-bebf-43857380e416). \
**PW**: 567A13012020

![](../../../.gitbook/assets/screencapture-postman-gov-sg-p-1-ab11edcd-d3c0-49c7-bebf-43857380e416-2020-07-28-22\_14\_01.png)
