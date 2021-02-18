# Creating announcements

## Announcement design

For an idea of how an announcement looks, see [this](https://www.figma.com/file/29FkTqWnA4yLKzstnvyY6X/%F0%9F%91%91Design-Master?node-id=5761%3A0).

## Available parameters

An announcement comprises of the following parameters:

- **title**: the title of the announcement
- **subtext**: the main text content of the announcement (optional)
- **mediaUrl**: the link to the image or video (optional)
- **primaryButtonUrl**: the link the user is directed to upon clicking the primary button
- **primaryButtonText**: the text displayed in the primary button
- **secondaryButtonUrl**: the link the user is directed to upon clicking the secondary button (optional)
- **secondaryButtonText**: the text displayed in the secondary button (optional)

There are 2 types of announcements:

- Graphic/text announcement
- Video announcement

## Graphic/text announcement parameters

A graphic/text announcement typically comprises the following parameters:

- title
- subtext
- primaryButtonUrl
- primaryButtonText
- secondaryButtonUrl (optional)
- secondaryButtonText (optional)

Furthermore, a graphic announcement also contains the following parameter:

- mediaUrl (link to an image)

## Video announcement parameters

A video announcement typically comprises the following parameters:

- title
- mediaUrl (link to a video)
- primaryButtonUrl
- primaryButtonText
- secondaryButtonUrl (optional)
- secondaryButtonText (optional)

## Creating an announcement

Announcement parameters are stored in the [frontend/src/locales/en/messages.po](../frontend/src/locales/en/messages.po) file.

### Editing a parameters

Steps to edit a parameter:

1. Navigate to the aforementioned file.
2. Locate the line that starts with `msgid` and contains the name of the parameter.
3. Replace the string in the line below it with your desired text.

For example, if you want to edit the **title** parameter,

1. Navigate to [frontend/src/locales/en/messages.po](../frontend/src/locales/en/messages.po).
2. Locate the line that states `msgid "announcement.title"`.
3. Replace the line right below it with `msgid "Insert new title here"`.

### Unused optional parameters

For any unused optional parameters, make sure to replace the text with `null`.

These parameters include:

- subtext
- mediaUrl
- secondaryButtonUrl
- secondaryButtonText

For example, if the **secondaryButtonUrl** parameter is unused, the lines should look like:

```
msgid "announcement.secondaryButtonUrl"
msgstr "null"
```
